"use client";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CourseDialog } from "./course-dialog";
import { deleteCourse } from "@/app/actions/course-actions";
import { Role } from "@/app/generated/prisma/enums";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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

interface CourseListProps {
    initialCourses: Course[];
    userRole: Role;
}

export function CourseList({ initialCourses, userRole }: CourseListProps) {
    const [courses, setCourses] = useState(initialCourses);
    const router = useRouter();

    // In a real app with server actions and revalidatePath, 
    // the page refetching might update the list. 
    // But for client interactivity, we might want optimistic updates or just rely on router.refresh().
    // Since we passed initialCourses, we should probably respect that, but if we delete, we want to see it gone.
    // The server action calls revalidatePath, so router.refresh() should fetch new data.

    async function handleDelete(id: number) {
        const result = await deleteCourse(id);
        if (result.success) {
            toast.success("Course deleted successfully");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to delete course");
        }
    }

    const canManage = userRole === Role.superAdmin;

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                {canManage && (
                    <CourseDialog
                        trigger={<Button> <Plus className="mr-2 h-4 w-4" />Add Course</Button>}
                        onSuccess={() => router.refresh()}
                    />
                )}
            </div>

            <div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Fee</TableHead>
                            {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialCourses.map((course) => (
                            <TableRow key={course.id}>
                                <TableCell className="font-medium">{course.name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-primary">
                                            Rs. {course.fees.reduce((sum, f) => sum + f.fee, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                                            {course.fees.map((fee) => (
                                                <span key={fee.id} className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground whitespace-nowrap">
                                                    {fee.type}: {fee.fee.toLocaleString()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </TableCell>
                                {canManage && (
                                    <TableCell className="flex gap-2">
                                        <CourseDialog
                                            course={course}
                                            trigger={
                                                <Button variant="ghost" size="icon">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                            onSuccess={() => router.refresh()}
                                        />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the course.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(course.id)} className="bg-red-500 hover:bg-red-600">
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {initialCourses.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canManage ? 3 : 2} className="text-center">
                                    No courses found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
