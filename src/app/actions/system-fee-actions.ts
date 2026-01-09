"use server";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { Role } from "@/app/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function getSystemFees() {
    try {
        const session = await getServerAuthSession();
        if (!session) {
            throw new Error("Unauthorized");
        }

        const fees = await prisma.systemFee.findMany({
            where: { deletedAt: null },
            orderBy: { name: "asc" }
        });

        return { success: true, data: fees };
    } catch (error) {
        console.error("Failed to fetch system fees:", error);
        return { success: false, error: "Failed to fetch system fees" };
    }
}

export async function createSystemFee(data: { name: string; amount: number }) {
    try {
        const session = await getServerAuthSession();
        if (!session || session.user.role !== Role.superAdmin) {
            throw new Error("Unauthorized");
        }

        const fee = await prisma.systemFee.create({
            data: {
                name: data.name,
                amount: data.amount
            }
        });

        revalidatePath("/dashboard/fees");
        return { success: true, data: fee };
    } catch (error) {
        console.error("Failed to create system fee:", error);
        return { success: false, error: "Failed to create system fee" };
    }
}

export async function updateSystemFee(id: number, data: { name: string; amount: number }) {
    try {
        const session = await getServerAuthSession();
        if (!session || session.user.role !== Role.superAdmin) {
            throw new Error("Unauthorized");
        }

        const fee = await prisma.systemFee.update({
            where: { id },
            data: {
                name: data.name,
                amount: data.amount
            }
        });

        revalidatePath("/dashboard/fees");
        return { success: true, data: fee };
    } catch (error) {
        console.error("Failed to update system fee:", error);
        return { success: false, error: "Failed to update system fee" };
    }
}

export async function deleteSystemFee(id: number) {
    try {
        const session = await getServerAuthSession();
        if (!session || session.user.role !== Role.superAdmin) {
            throw new Error("Unauthorized");
        }

        const existingFee = await prisma.systemFee.findUnique({
            where: { id }
        });

        if (!existingFee) {
            throw new Error("Fee not found");
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const fee = await prisma.systemFee.update({
            where: { id },
            data: { 
                name: `[DELETED_${timestamp}] ${existingFee.name}`,
                deletedAt: new Date() 
            }
        });

        revalidatePath("/dashboard/fees");
        return { success: true, data: fee };
    } catch (error) {
        console.error("Failed to delete system fee:", error);
        return { success: false, error: "Failed to delete system fee" };
    }
}
