"use server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Role } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";

type StudentFilter = {
  branchId?: number;
  courseId?: number;
  query?: string;
};

export async function getStudents(filter?: StudentFilter) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const where: any = {
      deletedAt: null,
    };

    // Role-based filtering
    if (session.user.role === Role.admin) {
        // Branch admin can only see their own branch students
        if (!session.user.branchId) {
            return { success: false, error: "Branch Admin has no branch assigned" };
        }
        where.branchId = session.user.branchId;
    } else if (session.user.role === Role.superAdmin) {
        // Super admin can filter by branch
        if (filter?.branchId) {
            where.branchId = filter.branchId;
        }
    }

    if (filter?.courseId) {
        where.enrollments = {
            some: {
                courseId: filter.courseId,
                deletedAt: null
            }
        };
    }

    if (filter?.query) {
       where.OR = [
           { full_name: { contains: filter.query } },
           { student_id: { contains: filter.query } },
           { phone_number: { contains: filter.query } }
       ];
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        branch: true,
        enrollments: {
            where: { deletedAt: null },
            include: {
                course: true
            }
        }
      },
      orderBy: {
        full_name: "asc",
      },
    });

    return { success: true, data: students };

  } catch (error) {
    console.error("Failed to fetch students:", error);
    return { success: false, error: "Failed to fetch students" };
  }
}

export async function createStudent(data: { 
    full_name: string; 
    phone_number: string; 
    student_id: string; 
    branchId?: number;
    courseIds: number[];
}) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    let branchId = data.branchId;

    if (session.user.role === Role.admin) {
        if (!session.user.branchId) {
            throw new Error("Branch Admin has no branch assigned");
        }
        branchId = session.user.branchId;
    } else if (session.user.role === Role.superAdmin) {
        if (!branchId) {
            throw new Error("Branch ID is required for Super Admin");
        }
    } else {
        throw new Error("Unauthorized");
    }

    if (!data.courseIds || data.courseIds.length === 0) {
        throw new Error("At least one course is required");
    }

    // Check for existing student with same full_name
    const existingStudent = await prisma.student.findUnique({
        where: { full_name: data.full_name } 
    });

    if (existingStudent) {
        if (existingStudent.deletedAt) {
             // Restore logic
             const restored = await prisma.$transaction(async (tx) => {
                 const student = await tx.student.update({
                     where: { id: existingStudent.id },
                     data: {
                         deletedAt: null,
                         phone_number: data.phone_number,
                         student_id: data.student_id,
                         branchId: branchId!,
                     }
                 });

                 // Update enrollments
                 // First verify if we need to clean up old enrollments
                 // Simplest: Delete all existing enrollments for this student (hard delete or soft delete, here hard delete to reset state is easier)
                 // But wait, enrollments might have history. 
                 // Let's just create new ones that don't exist and soft-delete/restore others.
                 
                 // Strategy:
                 // 1. Fetch current enrollments
                 // 2. Add new ones
                 // 3. Restore soft-deleted ones if in list
                 // 4. Soft-delete ones NOT in list
                 
                 const currentEnrollments = await tx.enrollment.findMany({
                     where: { studentId: student.id }
                 });
                 const oldCourseIds = currentEnrollments.map(e => e.courseId);
                 
                 const toAdd = data.courseIds.filter(cid => !oldCourseIds.includes(cid));
                 const toRestore = data.courseIds.filter(cid => oldCourseIds.includes(cid)); // These are in both, ensure they are active
                 const toRemove = oldCourseIds.filter(cid => !data.courseIds.includes(cid));
                 
                 if (toAdd.length > 0) {
                     await tx.enrollment.createMany({
                         data: toAdd.map(cid => ({
                             studentId: student.id,
                             courseId: cid
                         }))
                     });
                 }
                 
                 if (toRestore.length > 0) {
                     await tx.enrollment.updateMany({
                         where: {
                             studentId: student.id,
                             courseId: { in: toRestore }
                         },
                         data: { deletedAt: null }
                     });
                 }
                 
                 if (toRemove.length > 0) {
                     await tx.enrollment.updateMany({
                         where: {
                             studentId: student.id,
                             courseId: { in: toRemove }
                         },
                         data: { deletedAt: new Date() }
                     });
                 }

                 return student;
             });
             revalidatePath("/students");
             return { success: true, data: restored };
        } else {
             return { success: false, error: "Student with this name already exists." };
        }
    }
    
    // Create student with enrollments transactions
    const student = await prisma.$transaction(async (tx) => {
        const newStudent = await tx.student.create({
            data: {
                full_name: data.full_name,
                phone_number: data.phone_number,
                student_id: data.student_id,
                branchId: branchId!,
            }
        });

        // Create enrollments
        await tx.enrollment.createMany({
            data: data.courseIds.map(courseId => ({
                studentId: newStudent.id,
                courseId: courseId,
            }))
        });

        return newStudent;
    });

    revalidatePath("/students");
    return { success: true, data: student };
  } catch (error) {
    console.error("Failed to create student:", error);
    // Be nice and return specific error if it's unique constraint
    // Prisma P2002 is unique constraint violation
    if ((error as any).code === 'P2002') {
         return { success: false, error: "Student with this full name or username already exists (Unique constraint violation)." };
    }
    return { success: false, error: "Failed to create student" };
  }
}

export async function updateStudent(id: number, data: { 
    full_name: string; 
    phone_number: string; 
    student_id: string; 
    branchId?: number; 
    courseIds?: number[]; // We will actually implement update for courses now as multi-select should support it
}) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const existingStudent = await prisma.student.findUnique({
        where: { id },
        include: { branch: true }
    });

    if (!existingStudent) throw new Error("Student not found");

    if (session.user.role === Role.admin) {
        if (existingStudent.branchId !== session.user.branchId) {
            throw new Error("Unauthorized to edit student from another branch");
        }
        if (data.branchId && data.branchId !== existingStudent.branchId) {
             throw new Error("Branch Admin cannot change student branch");
        }
    }

    const updateData: any = {
        full_name: data.full_name,
        phone_number: data.phone_number,
        student_id: data.student_id,
    };

    if (session.user.role === Role.superAdmin && data.branchId) {
        updateData.branchId = data.branchId;
    }
    
    // We need to handle course updates. 
    // Best way is transaction: delete existing enrollments, create new ones.
    // Or basic diffing. But transaction delete/create is easiest for m-to-n reset.
    
    /* 
       Optimally, we shouldn't wipe all enrollments because we lose `assignedAt`. 
       However, the prompt didn't specify keeping history, just "select multiple option".
       For a simple CRUD, a wipe and replace is acceptable unless we want to preserve metadata.
       Let's stick to updateData only first to match previous simplistic approach, 
       BUT invalidating courses is tricky if we don't handle it.
       The user said "chenge to couse adding thing to a dropdwon select multipal opction".
       This implies in the Edit form too. So we should update enrollments.
    */

    const student = await prisma.$transaction(async (tx) => {
        const updated = await tx.student.update({
            where: { id },
            data: updateData
        });

        if (data.courseIds) {
             // Delete existing enrollments
             // Note: hard delete for this relation table is fine if we don't soft delete enrollments individually usually
             // But schema says deletedAt?
             // If we soft delete, we should check existing and undelete or create new.
             // Given Complexity, let's hard delete (physically remove) rows that are NOT in the new list?
             // Or update deletedAt.
             
             // Simplest approach respecting soft deletes:
             // 1. Find all current enrollments
             // 2. Identify to add, to remove.
             
             // Let's just create new ones and ignore old ones for now if simpler, but that creates dupes/errors.
             
             // Let's hard-replace:
             // To simplify, let's just wipe (hard delete) for this iteration since maintaining soft-delete history on a join table 
             // without explicit requirement is overkill and error prone with my limited context.
             // Wait, schema has `deletedAt`. Let's create proper logic.
             
             // Find existing
             const currentEnrollments = await tx.enrollment.findMany({
                 where: { studentId: id }
             });
             
             const currentCourseIds = currentEnrollments.map(e => e.courseId);
             
             const toAdd = data.courseIds.filter(cid => !currentCourseIds.includes(cid));
             const toRemove = currentCourseIds.filter(cid => !data.courseIds!.includes(cid));
             const toRestore = data.courseIds.filter(cid => currentCourseIds.includes(cid) && currentEnrollments.find(e => e.courseId === cid)?.deletedAt !== null);

             // Add new
             if (toAdd.length > 0) {
                 await tx.enrollment.createMany({
                     data: toAdd.map(cid => ({
                         studentId: id,
                         courseId: cid
                     }))
                 });
             }
             
             // Limit scope of "Remove" to soft delete?
             if (toRemove.length > 0) {
                 // Prisma doesn't support updateMany with composite ID easily in one go efficiently without multiple queries usually
                 // or `where: { AND: [ { studentId: id }, { courseId: { in: toRemove } } ] }`
                  await tx.enrollment.updateMany({
                      where: {
                          studentId: id,
                          courseId: { in: toRemove }
                      },
                      data: { deletedAt: new Date() }
                  });
             }
             
             // Restore (undelete)
             if (toRestore.length > 0) {
                  await tx.enrollment.updateMany({
                      where: {
                          studentId: id,
                          courseId: { in: toRestore }
                      },
                      data: { deletedAt: null } // Undelete
                  });
             }
        }
        
        return updated;
    });

    revalidatePath("/students");
    return { success: true, data: student };
  } catch (error) {
    console.error("Failed to update student:", error);
    if ((error as any).code === 'P2002') {
         return { success: false, error: "Unique constraint violation (full name)." };
    }
    return { success: false, error: "Failed to update student" };
  }
}

export async function deleteStudent(id: number) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      throw new Error("Unauthorized");
    }

    const existingStudent = await prisma.student.findUnique({
        where: { id },
    });

    if (!existingStudent) throw new Error("Student not found");

    if (session.user.role === Role.admin) {
        if (existingStudent.branchId !== session.user.branchId) {
            throw new Error("Unauthorized to delete student from another branch");
        }
    }

    const student = await prisma.$transaction(async (tx) => {
        // Soft delete the student
        const deletedStudent = await tx.student.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        // Soft delete all enrollments
        await tx.enrollment.updateMany({
            where: { studentId: id, deletedAt: null },
            data: {
                deletedAt: new Date(),
            },
        });

        // Soft delete all payments
        await tx.payment.updateMany({
            where: { studentId: id, deletedAt: null },
            data: {
                deletedAt: new Date(),
            },
        });

        return deletedStudent;
    });

    revalidatePath("/students");
    return { success: true, data: student };
  } catch (error) {
    console.error("Failed to delete student:", error);
    return { success: false, error: "Failed to delete student" };
  }
}
