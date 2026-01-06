"use server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Role } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function getStudentPaymentSummary(studentId: number) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Get student with enrollments and payments
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
      include: {
        enrollments: {
          where: { deletedAt: null },
          include: {
            course: true,
          },
        },
        payments: {
          where: { deletedAt: null },
        },
        branch: true,
      },
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    // Check permissions
    if (session.user.role === Role.admin) {
      if (student.branchId !== session.user.branchId) {
        return { success: false, error: "Unauthorized to view this student" };
      }
    }

    // Calculate total fees from enrolled courses
    const totalFees = student.enrollments.reduce((sum, enrollment) => {
      return sum + enrollment.course.fee;
    }, 0);

    // Calculate total paid amount
    const totalPaid = student.payments.reduce((sum, payment) => {
      return sum + payment.fee;
    }, 0);

    // Calculate remaining balance
    const remainingBalance = totalFees - totalPaid;

    return {
      success: true,
      data: {
        studentId: student.id,
        studentName: student.full_name,
        totalFees,
        totalPaid,
        remainingBalance,
        enrolledCourses: student.enrollments.map(e => ({
          courseName: e.course.name,
          fee: e.course.fee,
        })),
      },
    };
  } catch (error) {
    console.error("Failed to get payment summary:", error);
    return { success: false, error: "Failed to get payment summary" };
  }
}

export async function createPayment(data: {
  studentId: number;
  amount: number;
  paymentMethod: string;
}) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Verify student exists and check permissions
    const student = await prisma.student.findUnique({
      where: { id: data.studentId, deletedAt: null },
      include: { branch: true },
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    if (session.user.role === Role.admin) {
      if (student.branchId !== session.user.branchId) {
        return { success: false, error: "Unauthorized to add payment for this student" };
      }
    }

    // Validate amount
    if (data.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than 0" };
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (!session.user || !session.user.id) {
        console.error("Session user or ID is missing:", session.user);
        return { success: false, error: "Authentication error: User ID not found in session" };
    }

    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
        console.error("Invalid User ID in session:", session.user.id);
        return { success: false, error: "Authentication error: Invalid User ID in session" };
    }

    console.log("Attempting to create payment:", {
        studentId: data.studentId,
        fee: data.amount,
        payment_method: data.paymentMethod,
        userId: userId
    });

    const payment = await prisma.payment.create({
      data: {
        studentId: data.studentId,
        fee: data.amount,
        payment_method: data.paymentMethod,
        date: now,
        time: timeString,
        userId: userId,
      },
    });

    revalidatePath("/dashboard/students");
    return { success: true, data: payment };
  } catch (error) {
    console.error("Caught error in createPayment:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: "Failed to create payment: " + errorMessage };
  }
}

export async function getStudentPayments(studentId: number) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Verify student exists and check permissions
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
      include: { branch: true },
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    if (session.user.role === Role.admin) {
      if (student.branchId !== session.user.branchId) {
        return { success: false, error: "Unauthorized to view payments for this student" };
      }
    }

    // Get all payments for the student
    const payments = await prisma.payment.findMany({
      where: {
        studentId: studentId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: payments };
  } catch (error) {
    console.error("Failed to get student payments:", error);
    return { success: false, error: "Failed to get student payments" };
  }
}
