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

export async function createCourse(data: { name: string; fee: number }) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
      throw new Error("Unauthorized");
    }

    const course = await prisma.course.create({
      data: {
        name: data.name,
        fee: data.fee,
      },
    });

    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (error) {
    console.error("Failed to create course:", error);
    return { success: false, error: "Failed to create course" };
  }
}

export async function updateCourse(id: number, data: { name: string; fee: number }) {
  try {
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
      throw new Error("Unauthorized");
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        name: data.name,
        fee: data.fee,
      },
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

    const course = await prisma.course.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    revalidatePath("/courses");
    return { success: true, data: course };
  } catch (error) {
    console.error("Failed to delete course:", error);
    return { success: false, error: "Failed to delete course" };
  }
}
