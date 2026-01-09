"use client";

import { useState, useEffect } from "react";
import { getSystemFees, deleteSystemFee } from "@/app/actions/system-fee-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SystemFeeDialog } from "./system-fee-dialog";
import { Edit2, Trash2, Globe, Plus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type SystemFee = {
    id: number;
    name: string;
    amount: number;
};

export function SystemFeeList() {
    const [fees, setFees] = useState<SystemFee[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadFees();
    }, []);

    async function loadFees() {
        setLoading(true);
        const result = await getSystemFees();
        if (result.success && result.data) {
            setFees(result.data);
        } else {
            toast.error(result.error || "Failed to load fees");
        }
        setLoading(false);
    }

    async function handleDelete() {
        if (deleteId === null) return;
        setIsDeleting(true);
        const result = await deleteSystemFee(deleteId);
        if (result.success) {
            toast.success("Fee deleted successfully");
            loadFees();
        } else {
            toast.error(result.error || "Failed to delete fee");
        }
        setIsDeleting(false);
        setDeleteId(null);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide uppercase">Accessing General Fees...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <SystemFeeDialog
                    onSuccess={loadFees}
                    trigger={
                        <Button className="shadow-sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Add General Fee
                        </Button>
                    }
                />
            </div>

            <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-6">Fee Name</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead className="text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                                    No general fees defined.
                                </TableCell>
                            </TableRow>
                        ) : (
                            fees.map((fee) => (
                                <TableRow key={fee.id}>
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-500">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-zinc-900">{fee.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-zinc-900">Rs. {fee.amount.toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <SystemFeeDialog
                                                fee={fee}
                                                onSuccess={loadFees}
                                                trigger={
                                                    <Button variant="ghost" size="icon">
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                }
                                            />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action will delete the general fee. It will no longer be available for new student payments.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => {
                                                                setDeleteId(fee.id);
                                                                handleDelete(fee.id);
                                                            }}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
