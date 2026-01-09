"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourse, updateCourse } from "@/app/actions/course-actions";
import { toast } from "sonner";

type Course = {
    id: number;
    name: string;
    fees: {
        id: number;
        type: string;
        fee: number;
    }[];
};

type FeeItem = {
    id?: number;
    type: string;
    fee: string;
    isDeleted?: boolean;
};

interface CourseDialogProps {
    course?: Course;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: () => void;
}

export function CourseDialog({ course, trigger, open, onOpenChange, onSuccess }: CourseDialogProps) {
    const [name, setName] = useState(course?.name || "");
    const [fees, setFees] = useState<FeeItem[]>(
        course?.fees?.map(f => ({ id: f.id, type: f.type, fee: f.fee.toString() })) ||
        [{ type: "Entrance Fee", fee: "" }]
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [internalOpen, setInternalOpen] = useState(false);

    const isEdit = !!course;
    const effectiveOpen = open !== undefined ? open : internalOpen;
    const setEffectiveOpen = onOpenChange || setInternalOpen;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const formattedFees = fees
                .filter(f => !f.isDeleted)
                .map(f => {
                    const feeNumber = parseFloat(f.fee);
                    if (isNaN(feeNumber)) throw new Error(`Invalid fee for ${f.type}`);
                    return { ...f, fee: feeNumber };
                });

            if (formattedFees.length === 0) {
                throw new Error("At least one fee is required");
            }

            // Include deleted fees in update
            const finalFees = [
                ...formattedFees,
                ...fees.filter(f => f.isDeleted && f.id).map(f => ({ ...f, fee: parseFloat(f.fee) || 0 }))
            ];

            const result = isEdit
                ? await updateCourse(course.id, { name, fees: finalFees })
                : await createCourse({ name, fees: formattedFees });

            if (!result.success) {
                throw new Error(result.error || "Failed to save course");
            }

            toast.success(isEdit ? "Course updated successfully" : "Course created successfully");
            setEffectiveOpen(false);
            if (onSuccess) onSuccess();
            if (!isEdit) {
                setName("");
                setFees([{ type: "Entrance Fee", fee: "" }]);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const addFee = () => {
        setFees([...fees, { type: "", fee: "" }]);
    };

    const removeFee = (index: number) => {
        const newFees = [...fees];
        if (newFees[index].id) {
            newFees[index].isDeleted = true;
        } else {
            newFees.splice(index, 1);
        }
        setFees(newFees);
    };

    const updateFee = (index: number, field: keyof FeeItem, value: string) => {
        const newFees = [...fees];
        newFees[index] = { ...newFees[index], [field]: value };
        setFees(newFees);
    };

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Course" : "Add New Course"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md font-medium">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="name">Course Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="e.g. Mathematics"
                            className="bg-muted/30 focus:bg-background"
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Fees</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addFee}>
                                Add Fee
                            </Button>
                        </div>
                        {fees.filter(f => !f.isDeleted).map((feeItem, index) => {
                            // Find actual index in state
                            const actualIndex = fees.indexOf(feeItem);
                            return (
                                <div key={actualIndex} className="flex gap-2 items-start bg-muted/20 p-3 rounded-lg relative group">
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            placeholder="Fee Type (e.g. Monthly Fee)"
                                            value={feeItem.type}
                                            onChange={(e) => updateFee(actualIndex, 'type', e.target.value)}
                                            required
                                            className="h-8 text-sm"
                                        />
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">
                                                Rs.
                                            </span>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={feeItem.fee}
                                                onChange={(e) => updateFee(actualIndex, 'fee', e.target.value)}
                                                required
                                                placeholder="0.00"
                                                className="pl-9 h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeFee(actualIndex)}
                                        disabled={fees.filter(f => !f.isDeleted).length <= 1}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setEffectiveOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="shadow-sm">
                            {loading ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
