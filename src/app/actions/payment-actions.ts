"use server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Role } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { sendSMS } from "@/lib/sms";

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
            course: {
              include: {
                fees: {
                  where: { deletedAt: null }
                }
              }
            },
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

    // Calculate total fees from enrolled courses (summing all fee types)
    const totalFees = student.enrollments.reduce((sum, enrollment) => {
      const courseFees = enrollment.course.fees.reduce((fSum, f) => fSum + f.fee, 0);
      return sum + courseFees;
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
          courseId: e.course.id,
          courseName: e.course.name,
          fee: e.course.fees.reduce((sum, f) => sum + f.fee, 0),
          feeBreakdown: e.course.fees.map(f => {
            // Find payments for this specific fee type
            const paidForThisFee = student.payments
              .filter(p => p.courseFeeId === f.id)
              .reduce((sum, p) => sum + p.fee, 0);
            
            return { 
              id: f.id, 
              type: f.type, 
              fee: f.fee,
              paid: paidForThisFee,
              remaining: f.fee - paidForThisFee
            };
          })
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
  courseId?: number;
  courseFeeId?: number;
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
        courseId: data.courseId,
        courseFeeId: data.courseFeeId,
      },
    });

    revalidatePath("/dashboard/students");

    // Send SMS msg to student
    try {
      const formattedDate = now.toISOString().split('T')[0];
      
      let feeTypeLabel = "";
      if (data.courseFeeId) {
          const feeDetail = await prisma.courseFee.findUnique({
              where: { id: data.courseFeeId },
              include: { course: true }
          });
          if (feeDetail) {
              feeTypeLabel = ` for ${feeDetail.course.name} (${feeDetail.type})`;
          }
      }

      const message = `Payment Received: LKR ${data.amount} has been successfully recorded${feeTypeLabel} on ${formattedDate} at ${timeString}.`;
      
      const smsResponse = await sendSMS(student.phone_number, message);

      let isSuccess = false;
      try {
        const parsed = JSON.parse(smsResponse);
        if (parsed.status === "success") {
          isSuccess = true;
        }
      } catch (parseError) {
        console.error("Failed to parse SMS response:", parseError);
      }

      if (isSuccess) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { sms_status: true },
        });
      }
    } catch (smsError) {
      console.error("Failed to send SMS:", smsError);
    }

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
        course: true,
        courseFee: true,
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

export async function getPaymentReports(filters?: { 
  branchId?: number; 
  courseId?: number;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
      throw new Error("Unauthorized");
    }

    const where: any = { deletedAt: null };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        // To include the entire end date, we set it to the end of the day
        const endDay = new Date(filters.endDate);
        endDay.setHours(23, 59, 59, 999);
        where.date.lte = endDay;
      }
    }
    
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
        course: true, // Include course info for direct link aggregation
        student: {
          include: {
            branch: true,
            enrollments: {
              where: { deletedAt: null },
              include: {
                course: {
                  include: {
                    fees: {
                      where: { deletedAt: null }
                    }
                  }
                }
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
      
      // Course Aggregation
      // If the payment is directly linked to a course, use that.
      // Otherwise, use the old proportional logic for legacy data.
      if (payment.courseId) {
          const courseName = payment.course?.name || "Unknown Course";
          courseTotals[courseName] = (courseTotals[courseName] || 0) + amount;
          
          if (filters?.courseId && payment.courseId === filters.courseId) {
              totalRevenue += amount;
          } else if (!filters?.courseId) {
              totalRevenue += amount;
          }
      } else {
          // Old Proportional Distribution for legacy payments
          const enrollments = payment.student.enrollments;
          const totalStudentFees = enrollments.reduce((sum: number, e: any) => {
            return sum + e.course.fees.reduce((fSum: number, f: any) => fSum + f.fee, 0);
          }, 0);

          let attributedToFilteredCourse = 0;
          if (totalStudentFees > 0) {
            enrollments.forEach((enrollment: any) => {
              const courseName = enrollment.course.name;
              const courseTotalFee = enrollment.course.fees.reduce((fSum: number, f: any) => fSum + f.fee, 0);
              const proportion = courseTotalFee / totalStudentFees;
              const attributedAmount = amount * proportion;
              
              courseTotals[courseName] = (courseTotals[courseName] || 0) + attributedAmount;
              
              if (filters?.courseId === enrollment.courseId) {
                 attributedToFilteredCourse = attributedAmount;
              }
            });
          }

          if (filters?.courseId) {
            totalRevenue += attributedToFilteredCourse;
          } else {
            totalRevenue += amount;
          }
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

    // --- New Logic: Student Metrics ---

    // 1. Build Student Filter
    const studentWhereInput: any = { deletedAt: null };
    if (filters?.branchId) {
        studentWhereInput.branchId = filters.branchId;
    }
    if (filters?.courseId) {
        studentWhereInput.enrollments = {
            some: {
                courseId: filters.courseId,
                deletedAt: null
            }
        };
    }

    // 2. Total Students
    const totalStudents = await prisma.student.count({
        where: studentWhereInput
    });

    // 3. Fully Paid Students
    // We need to fetch students to calculate their financial status
    const students = await prisma.student.findMany({
        where: studentWhereInput,
        include: {
            enrollments: {
                where: { deletedAt: null },
                include: { 
                    course: {
                        include: {
                            fees: {
                                where: { deletedAt: null }
                            }
                        }
                    } 
                }
            },
            payments: {
                where: { deletedAt: null }
            }
        }
    });

    let fullyPaidStudents = 0;
    let totalOutstanding = 0;

    students.forEach(student => {
        // Calculate Total Fees
        let totalFees = 0;
        student.enrollments.forEach((enrollment: any) => {
           totalFees += enrollment.course.fees.reduce((fSum: number, f: any) => fSum + f.fee, 0);
        });

        // Calculate Total Paid
        const totalPaid = student.payments.reduce((sum, p) => sum + p.fee, 0);

        if (totalPaid >= totalFees && totalFees > 0) { 
            fullyPaidStudents++;
        }
        
        // Calculate Outstanding
        if (totalFees > totalPaid) {
            totalOutstanding += (totalFees - totalPaid);
        }
    });

    return {
      success: true,
      data: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        branchTotals: formattedBranchTotals,
        courseTotals: formattedCourseTotals,
        totalStudents,
        fullyPaidStudents,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100
      }
    };

  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return { success: false, error: "Failed to fetch reports" };
  }
}


export async function getFailedSmsPayments() {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const failedPayments = await prisma.payment.findMany({
      where: {
        sms_status: false,
        deletedAt: null,
      },
      include: {
        student: {
            select: {
                full_name: true,
                phone_number: true,
            }
        }
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: failedPayments };
  } catch (error) {
    console.error("Failed to get failed SMS payments:", error);
    return { success: false, error: "Failed to fetch failed SMS payments" };
  }
}

export async function retrySms(paymentIds: number[]) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const results = {
      successCount: 0,
      failCount: 0,
      errors: [] as string[]
    };

    const payments = await prisma.payment.findMany({
      where: {
        id: { in: paymentIds },
        sms_status: false,
        deletedAt: null 
      },
      include: {
        student: true
      }
    });

    for (const payment of payments) {
      try {
        const dateObj = new Date(payment.date);
        const formattedDate = dateObj.toISOString().split('T')[0];
        const message = `Payment Received: LKR ${payment.fee} has been successfully recorded in the system on ${formattedDate} at ${payment.time}.`;
        
        const smsResponse = await sendSMS(payment.student.phone_number, message);
        
        let isSuccess = false;
        try {
            const parsed = JSON.parse(smsResponse);
            if (parsed.status === "success") {
                isSuccess = true;
            }
        } catch (e) {
            console.error("Error parsing SMS response during retry:", e);
        }

        if (isSuccess) {
            await prisma.payment.update({
                where: { id: payment.id },
                data: { sms_status: true }
            });
            results.successCount++;
        } else {
            results.failCount++;
        }

      } catch (err) {
        console.error(`Failed to retry SMS for payment ${payment.id}:`, err);
        results.failCount++;
        results.errors.push(`Payment ${payment.id}: ${String(err)}`);
      }
    }

    return { success: true, data: results };

  } catch (error) {
    console.error("Failed to retry SMS batch:", error);
    return { success: false, error: "Failed to process retry request" };
  }
}

