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
    fee: number;
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
    const [fee, setFee] = useState(course?.fee?.toString() || "");
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
            const feeNumber = parseFloat(fee);
            if (isNaN(feeNumber)) throw new Error("Invalid fee");

            const result = isEdit
                ? await updateCourse(course.id, { name, fee: feeNumber })
                : await createCourse({ name, fee: feeNumber });

            if (!result.success) {
                throw new Error(result.error || "Failed to save course");
            }

            toast.success(isEdit ? "Course updated successfully" : "Course created successfully");
            setEffectiveOpen(false);
            if (onSuccess) onSuccess();
            if (!isEdit) {
                setName("");
                setFee("");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Course" : "Add Course"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="space-y-2">
                        <Label htmlFor="name">Course Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fee">Fee</Label>
                        <Input
                            id="fee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={fee}
                            onChange={(e) => setFee(e.target.value)}
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setEffectiveOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
