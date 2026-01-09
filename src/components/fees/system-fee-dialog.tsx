"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSystemFee, updateSystemFee } from "@/app/actions/system-fee-actions";
import { toast } from "sonner";
import { Globe, Plus, AlertCircle, Loader2 } from "lucide-react";

type SystemFee = {
    id: number;
    name: string;
    amount: number;
};

interface SystemFeeDialogProps {
    fee?: SystemFee;
    trigger?: React.ReactNode;
    onSuccess?: () => void;
}

export function SystemFeeDialog({ fee, trigger, onSuccess }: SystemFeeDialogProps) {
    const [name, setName] = useState(fee?.name || "");
    const [amount, setAmount] = useState(fee?.amount?.toString() || "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);

    const isEdit = !!fee;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const amountNumber = parseFloat(amount);
            if (isNaN(amountNumber)) throw new Error("Invalid amount");

            const result = isEdit
                ? await updateSystemFee(fee.id, { name, amount: amountNumber })
                : await createSystemFee({ name, amount: amountNumber });

            if (!result.success) {
                throw new Error(result.error || "Failed to save fee");
            }

            toast.success(isEdit ? "Fee updated successfully" : "Fee created successfully");
            setOpen(false);
            if (onSuccess) onSuccess();
            if (!isEdit) {
                setName("");
                setAmount("");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit General Fee" : "Add New General Fee"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name">Fee Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. Entrance Fee"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (Rs.)</Label>
                        <Input
                            id="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            placeholder="5000.00"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                isEdit ? "Save Changes" : "Create Fee"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
