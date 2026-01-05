"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBranch(data: { branch_name: string; show_id: string }) {
  try {
    const branch = await prisma.branch.create({
      data: {
        branch_name: data.branch_name,
        show_id: data.show_id,
      },
    });
    revalidatePath("/dashboard/onboard-branches");
    return { success: true, data: branch };
  } catch (error) {
    return { success: false, error: "Failed to create branch" };
  }
}

export async function updateBranch(id: number, data: { branch_name: string; show_id: string }) {
  if (id === 1) {
    return { success: false, error: "Cannot edit the default branch." };
  }

  try {
    const branch = await prisma.branch.update({
      where: { id },
      data: {
        branch_name: data.branch_name,
        show_id: data.show_id,
      },
    });
    revalidatePath("/dashboard/onboard-branches");
    return { success: true, data: branch };
  } catch (error) {
    return { success: false, error: "Failed to update branch" };
  }
}

export async function deleteBranch(id: number) {
  if (id === 1) {
    return { success: false, error: "Cannot delete the default branch." };
  }

  try {
    await prisma.branch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/dashboard/onboard-branches");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete branch" };
  }
}

export async function getBranches() {
  try {
    const branches = await prisma.branch.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
    });
    return { success: true, data: branches };
  } catch (error) {
    return { success: false, error: "Failed to fetch branches" };
  }
}
