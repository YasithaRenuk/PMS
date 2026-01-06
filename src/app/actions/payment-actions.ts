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

export async function getPaymentReports(filters?: { branchId?: number; courseId?: number }) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
      throw new Error("Unauthorized");
    }

    const where: any = { deletedAt: null };
    
    // Add student filter ensuring students are not deleted
    const studentFilter: any = { deletedAt: null };
    let hasStudentFilter = false;

    if (filters?.branchId) {
        studentFilter.branchId = filters.branchId;
        hasStudentFilter = true;
    }

    if (filters?.courseId) {
        studentFilter.enrollments = {
            some: {
                courseId: filters.courseId,
                deletedAt: null
            }
        };
        hasStudentFilter = true;
    }

    if (hasStudentFilter) {
        where.student = studentFilter;
    }

    console.log("getPaymentReports logic:", {
        filters,
        whereClause: JSON.stringify(where, null, 2)
    });

    // Get all payments with student and branch info
    const allPayments = await prisma.payment.findMany({
      where,
      include: {
        student: {
          include: {
            branch: true,
            enrollments: {
              where: { deletedAt: null },
              include: {
                course: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    console.log(`Found ${allPayments.length} payments after filtering.`);

    const branchTotals: Record<string, number> = {};
    const courseTotals: Record<string, number> = {};
    let totalRevenue = 0;

    const courses = await prisma.course.findMany({ where: { deletedAt: null } });

    allPayments.forEach(payment => {
      const amount = payment.fee;
      
      // Course Aggregation (Proportional distribution)
      const enrollments = payment.student.enrollments;
      const totalStudentFees = enrollments.reduce((sum, e) => sum + e.course.fee, 0);

      let attributedToFilteredCourse = 0;
      if (totalStudentFees > 0) {
        enrollments.forEach(enrollment => {
          const courseName = enrollment.course.name;
          const proportion = enrollment.course.fee / totalStudentFees;
          const attributedAmount = amount * proportion;
          
          courseTotals[courseName] = (courseTotals[courseName] || 0) + attributedAmount;
          
          if (filters?.courseId === enrollment.courseId) {
             attributedToFilteredCourse = attributedAmount;
          }
        });
      }

      // If filtering by course, total revenue is only what's attributed to that course
      // Otherwise it's the full payment amount
      if (filters?.courseId) {
        totalRevenue += attributedToFilteredCourse;
      } else {
        totalRevenue += amount;
      }

      // Branch Aggregation
      const branchName = payment.student.branch.branch_name;
      branchTotals[branchName] = (branchTotals[branchName] || 0) + amount;
    });

    // Format for easier display
    let formattedBranchTotals = Object.entries(branchTotals).map(([name, total]) => ({ name, total }));
    let formattedCourseTotals = Object.entries(courseTotals).map(([name, total]) => ({ name, total }));

    // If filtering by branch/course, we might want to ensure the list is focused or sorted
    if (filters?.branchId) {
        formattedBranchTotals = formattedBranchTotals.sort((a, b) => b.total - a.total);
    }
    
    // When filtering by a specific course, we only want to show that course in the summary table
    // or at least prioritize it.
    if (filters?.courseId) {
        const filteredCourse = courses.find(c => c.id === filters.courseId);
        if (filteredCourse) {
            formattedCourseTotals = formattedCourseTotals.filter(c => c.name === filteredCourse.name);
        }
    } else {
        formattedCourseTotals = formattedCourseTotals.sort((a, b) => b.total - a.total);
    }

    return {
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimals
        branchTotals: formattedBranchTotals,
        courseTotals: formattedCourseTotals,
      }
    };

  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return { success: false, error: "Failed to fetch reports" };
  }
}
