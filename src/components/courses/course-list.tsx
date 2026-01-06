"use client";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CourseDialog } from "./course-dialog";
import { deleteCourse } from "@/app/actions/course-actions";
import { Role } from "@/app/generated/prisma/enums";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Course = {
    id: number;
    name: string;
    fee: number;
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
        if (!confirm("Are you sure you want to delete this course?")) return;

        const result = await deleteCourse(id);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error);
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
                                <TableCell>{course.fee.toFixed(2)}</TableCell>
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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => handleDelete(course.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
