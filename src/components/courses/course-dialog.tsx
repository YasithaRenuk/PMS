"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCourse, updateCourse } from "@/app/actions/course-actions";
import { toast } from "sonner";
import { FEE_TYPES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Plus, Trash2, AlertCircle, Loader2, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

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
    customType?: string;
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
        course?.fees?.map(f => {
            const isStandard = FEE_TYPES.includes(f.type as any);
            return {
                id: f.id,
                type: isStandard ? f.type : "Other",
                customType: isStandard ? "" : f.type,
                fee: f.fee.toString()
            };
        }) || [{ type: "Entrance Fee", fee: "" }]
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
                    if (isNaN(feeNumber)) throw new Error(`Invalid fee for ${f.type === "Other" ? f.customType : f.type}`);

                    const finalType = f.type === "Other" ? f.customType?.trim() : f.type;
                    if (!finalType) throw new Error("Fee type is required");

                    return { ...f, type: finalType, fee: feeNumber };
                });

            // Check for duplicate types
            const types = formattedFees.map(f => f.type.toLowerCase());
            const duplicateType = types.find((type, index) => types.indexOf(type) !== index);
            if (duplicateType) {
                throw new Error(`Duplicate fee type: ${formattedFees.find(f => f.type.toLowerCase() === duplicateType)?.type}`);
            }

            if (formattedFees.length === 0) {
                throw new Error("At least one fee is required");
            }

            // Include deleted fees in update
            const finalFees = [
                ...formattedFees,
                ...fees.filter(f => f.isDeleted && f.id).map(f => ({
                    ...f,
                    type: f.type === "Other" ? f.customType || f.type : f.type,
                    fee: parseFloat(f.fee) || 0
                }))
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
            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-background to-background">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">
                                {isEdit ? "Update Course" : "Create New Course"}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {isEdit ? "Modify course details and fee structures" : "Define a new course and its associated fees"}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-6">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/50 font-medium animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            Course Name
                        </Label>
                        <div className="relative group">
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="e.g. Advanced Mathematics"
                                className="pl-4 h-11 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Fee Structure
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addFee}
                                className="h-8 border-dashed border-zinc-300 hover:border-primary hover:text-primary transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Add Fee Type
                            </Button>
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                            {fees.filter(f => !f.isDeleted).map((feeItem, index) => {
                                const actualIndex = fees.indexOf(feeItem);
                                return (
                                    <div
                                        key={actualIndex}
                                        className="group relative flex flex-col gap-3 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-in fade-in zoom-in-95"
                                    >
                                        <div className="flex gap-3 items-start">
                                            <div className="flex-1 space-y-3">
                                                <div className="space-y-1.5">
                                                    <Select
                                                        value={feeItem.type}
                                                        onValueChange={(val) => updateFee(actualIndex, 'type', val)}
                                                        required
                                                    >
                                                        <SelectTrigger className="h-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20">
                                                            <SelectValue placeholder="Select Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {FEE_TYPES.map((type) => {
                                                                const isUsed = fees.some((f, idx) => !f.isDeleted && idx !== actualIndex && f.type === type && type !== "Other");
                                                                if (isUsed) return null;
                                                                return (
                                                                    <SelectItem key={type} value={type}>
                                                                        {type}
                                                                    </SelectItem>
                                                                );
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {feeItem.type === "Other" && (
                                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <Input
                                                            placeholder="Type custom fee name..."
                                                            value={feeItem.customType || ""}
                                                            onChange={(e) => updateFee(actualIndex, 'customType', e.target.value)}
                                                            className="h-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20"
                                                            required
                                                        />
                                                    </div>
                                                )}
                                                <div className="relative">
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                                        {/* <IndianRupee className="w-3.5 h-3.5" /> */}
                                                        Rs.
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={feeItem.fee}
                                                        onChange={(e) => updateFee(actualIndex, 'fee', e.target.value)}
                                                        required
                                                        placeholder="0.00"
                                                        className="pl-9 h-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-primary/20"
                                                    />
                                                </div>
                                            </div>
                                            {fees.filter(f => !f.isDeleted).length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                    onClick={() => removeFee(actualIndex)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEffectiveOpen(false)}
                            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                        >
                            Discard
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="min-w-[100px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Course"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
