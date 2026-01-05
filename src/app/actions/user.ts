"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { Role } from "@/app/generated/prisma/enums";
import { getServerAuthSession } from "@/lib/auth";

type CreateUserData = {
  username: string;
  password?: string; // Optional for creation if we set a default, but usually required. Making optional in type to handle update partials better, but logic will enforce.
  role: Role;
  branchId: number | null;
};

type UpdateUserData = {
  username?: string;
  password?: string;
  role?: Role;
  branchId?: number | null;
};

export async function createUser(data: CreateUserData & { password: string }) {
  const session = await getServerAuthSession();
  if (!session || session.user.role !== Role.superAdmin) {
    return { success: false, error: "Unauthorized: Only Super Admin can create users." };
  }

  try {
    const hashedPassword = await hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        role: data.role,
        branchId: data.branchId,
      },
    });
    revalidatePath("/dashboard/branch-admins");
    return { success: true, data: user };
  } catch (error) {
    console.error("Create User Error:", error);
    return { success: false, error: "Failed to create user. Username might already exist." };
  }
}

export async function updateUser(id: number, data: UpdateUserData) {
  const session = await getServerAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };
  
  // Permission Check: SuperAdmin OR Self
  if (session.user.role !== Role.superAdmin && session.user.id !== id.toString()) {
    return { success: false, error: "Unauthorized: You can only edit your own account." };
  }

  try {
    // ID 1 Protection Logic
    if (id === 1) {
      if (data.role !== undefined || (data.branchId !== undefined && session.user.role !== Role.superAdmin)) {
         // Allow SuperAdmin to theoretically change branchId but logic says "role or branch cannot be changed for ID 1"?
         // Let's stick to prompts: ID 1 cannot change role/branch.
         if (data.role || data.branchId) {
             return { success: false, error: "Cannot change Role or Branch for the Super Admin (ID 1)." };
         }
      }
    }

    // Role/Branch Update Protection for Non-SuperAdmins
    if (session.user.role !== Role.superAdmin && (data.role || data.branchId !== undefined)) {
        return { success: false, error: "Unauthorized: You cannot change your Role or Branch." };
    }

    const updateData: any = {};
    if (data.username) updateData.username = data.username;
    if (data.password) {
      updateData.password = await hash(data.password, 12);
    }
    if (data.role) updateData.role = data.role;
    // Explicitly handle null for branchId
    if (data.branchId !== undefined) updateData.branchId = data.branchId;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });
    revalidatePath("/dashboard/branch-admins");
    return { success: true, data: user };
  } catch (error) {
    console.error("Update User Error:", error);
    return { success: false, error: "Failed to update user." };
  }
}

export async function deleteUser(id: number) {
  if (id === 1) {
    return { success: false, error: "Cannot delete the Super Admin (ID 1)." };
  }

  const session = await getServerAuthSession();
  if (!session || session.user.role !== Role.superAdmin) {
    return { success: false, error: "Unauthorized: Only Super Admin can delete users." };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/dashboard/branch-admins");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete user" };
  }
}

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      include: {
        branch: true,
      },
    });
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: "Failed to fetch users" };
  }
}
