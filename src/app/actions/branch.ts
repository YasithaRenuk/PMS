"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createBranch(data: { branch_name: string; show_id: string }) {
  try {
    // Check if branch exists (including soft-deleted)
    // Note: branch_name is NOT unique in schema but user treats it as such or at least we want to avoid duplicates if possible?
    // The prompt says "Unique constraint violation", likely on 'show_id' or 'branch_name' if they added unique to schema or if I missed it.
    // Looking at schema provided: show_id is string, not unique. branch_name is string, not unique. 
    // Wait, the user said "Unique constraint violation". Maybe they added @unique recently and I missed it in view_file?
    // Let's check schema again. Schema view showed:
    /*
    model Branch {
      id          Int     @id @default(autoincrement())
      branch_name String
      show_id     String
    */
    // There is NO @unique. However, maybe the DB has it and schema file is out of sync? Or user is mistaken?
    // Or maybe they are cleaning up duplicates manually?
    // Regardless, good practice: check if exists.
    
    // Actually, checking standard unique constraints logic.
    // Let's implement "Find existing by name OR show_id".
    const existingBranch = await prisma.branch.findFirst({
        where: {
            OR: [
                { branch_name: data.branch_name },
                { show_id: data.show_id }
            ]
        }
    });

    if (existingBranch) {
        if (existingBranch.deletedAt) {
            // Restore it
            // We'll update both fields to new values (in case one matched and other didn't, or to ensure consistency)
            const restored = await prisma.branch.update({
                where: { id: existingBranch.id },
                data: {
                    deletedAt: null,
                    branch_name: data.branch_name,
                    show_id: data.show_id
                }
            });
            revalidatePath("/dashboard/onboard-branches");
            return { success: true, data: restored };
        } else {
             return { success: false, error: "Branch with this name or ID already exists." };
        }
    }

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
