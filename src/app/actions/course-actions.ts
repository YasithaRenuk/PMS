"use server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Role } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function getCourses() {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const courses = await prisma.course.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        fees: {
          where: { deletedAt: null }
        }
      },
      orderBy: {
        name: "asc",
      },
    });

    return { success: true, data: courses };
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return { success: false, error: "Failed to fetch courses" };
  }
}

export async function createCourse(data: { 
  name: string; 
  fees: { type: string; fee: number }[] 
}) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
      throw new Error("Unauthorized");
    }

    const course = await prisma.course.create({
      data: {
        name: data.name,
        fees: {
          create: data.fees.map(f => ({
            type: f.type,
            fee: f.fee
          }))
        }
      },
      include: {
        fees: true
      }
    });

    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (error) {
    console.error("Failed to create course:", error);
    return { success: false, error: "Failed to create course" };
  }
}

export async function updateCourse(
  id: number, 
  data: { 
    name: string; 
    fees: { id?: number; type: string; fee: number; isDeleted?: boolean }[] 
  }
) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
      throw new Error("Unauthorized");
    }

    // Use a transaction to update course and its fees
    const course = await prisma.$transaction(async (tx) => {
      // 1. Update course name
      const updatedCourse = await tx.course.update({
        where: { id },
        data: { name: data.name },
      });

      // 2. Handle fees
      for (const feeData of data.fees) {
        if (feeData.isDeleted && feeData.id) {
            // Soft delete
            await tx.courseFee.update({
                where: { id: feeData.id },
                data: { deletedAt: new Date() }
            });
        } else if (feeData.id) {
          // Update existing fee
          await tx.courseFee.update({
            where: { id: feeData.id },
            data: {
              type: feeData.type,
              fee: feeData.fee,
              deletedAt: null // Ensure it's not deleted if being updated
            },
          });
        } else {
          // Create new fee
          await tx.courseFee.create({
            data: {
              courseId: id,
              type: feeData.type,
              fee: feeData.fee,
            },
          });
        }
      }

      return updatedCourse;
    });

    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (error) {
    console.error("Failed to update course:", error);
    return { success: false, error: "Failed to update course" };
  }
}

export async function deleteCourse(id: number) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
      throw new Error("Unauthorized");
    }

    const course = await prisma.$transaction(async (tx) => {
      // 1. Soft delete the course
      const deletedCourse = await tx.course.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // 2. Soft delete all enrollments associated with this course
      await tx.enrollment.updateMany({
        where: { courseId: id, deletedAt: null },
        data: {
          deletedAt: new Date(),
        },
      });

      // 3. Soft delete all fees associated with this course
      await tx.courseFee.updateMany({
        where: { courseId: id, deletedAt: null },
        data: {
          deletedAt: new Date(),
        },
      });

      // Note: We don't soft-delete payments associated with the course here,
      // as payments are financial records that should typically be preserved
      // even if the course is deleted, unless explicitly requested.

      return deletedCourse;
    });

    revalidatePath("/courses");
    revalidatePath("/students"); // Students' enrollment list might change
    return { success: true, data: course };
  } catch (error) {
    console.error("Failed to delete course:", error);
    return { success: false, error: "Failed to delete course" };
  }
}
