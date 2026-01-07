"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentDialog } from "./student-dialog";
import { PaymentDialog } from "./payment-dialog";
import { PaymentRecordsDialog } from "./payment-records-dialog";
import { deleteStudent } from "@/app/actions/student-actions";
import { Role } from "@/app/generated/prisma/enums";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2, Search, DollarSign, Eye, Plus } from "lucide-react";
import { useState, useCallback } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Helper for debounce if library not present (assuming I should check but standard to have one)
// But to avoid install, I'll use a simple custom hook or plain timeout for now if use-debounce isn't there.
// I'll check via tool? No, let's just write a simple debounce wrapper.

function useDebounce<T extends (...args: any[]) => void>(callback: T, delay: number) {
    const timeoutRef = useState<NodeJS.Timeout | null>(null);

    return useCallback((...args: Parameters<T>) => {
        if (timeoutRef[0]) clearTimeout(timeoutRef[0]);
        const timeout = setTimeout(() => {
            callback(...args);
        }, delay);
        timeoutRef[1](timeout);
    }, [callback, delay, timeoutRef]);
}

type Branch = {
    id: number;
    branch_name: string;
};

type Course = {
    id: number;
    name: string;
};

type Enrollment = {
    courseId: number;
    course: Course;
};

type Student = {
    id: number;
    full_name: string;
    phone_number: string;
    student_id: string;
    branchId: number;
    branch: Branch;
    enrollments: Enrollment[];
};

interface StudentListProps {
    students: Student[];
    branches: Branch[];
    courses: Course[];
    userRole: Role;
}

export function StudentList({ students, branches, courses, userRole }: StudentListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Filters
    const selectedBranchId = searchParams.get("branchId") || "all";
    const selectedCourseId = searchParams.get("courseId") || "all";
    const initialQuery = searchParams.get("query") || "";

    const [query, setQuery] = useState(initialQuery);

    const isSuperAdmin = userRole === Role.superAdmin;

    // Custom debounce since I can't guarantee package
    const debouncedSearch = useDebounce((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }
        router.push(`/dashboard/students?${params.toString()}`);
    }, 500);

    const handleSearch = (term: string) => {
        setQuery(term);
        debouncedSearch(term);
    };

    function handleFilterChange(key: string, value: string) {
        const params = new URLSearchParams(searchParams);
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        // Keep query if exists
        router.push(`/dashboard/students?${params.toString()}`);
    }

    async function handleDelete(id: number) {
        const result = await deleteStudent(id);
        if (result.success) {
            toast.success("Student deleted successfully");
            router.refresh();
        } else {
            toast.error(result.error || "Failed to delete student");
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <StudentDialog
                    courses={courses}
                    branches={branches}
                    userRole={userRole}
                    trigger={<Button> <Plus className="mr-2 h-4 w-4" /> Add Student</Button>}
                    onSuccess={() => router.refresh()}
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by Name, ID, or Phone..."
                        className="pl-8 w-full"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                    {isSuperAdmin && (
                        <div className="w-full md:w-[200px]">
                            <Select value={selectedBranchId} onValueChange={(v) => handleFilterChange("branchId", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Branches" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Branches</SelectItem>
                                    {branches.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.branch_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="w-full md:w-[200px]">
                        <Select value={selectedCourseId} onValueChange={(v) => handleFilterChange("courseId", v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Courses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Courses</SelectItem>
                                {courses.map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Courses</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>{student.student_id}</TableCell>
                                <TableCell className="font-medium">{student.full_name}</TableCell>
                                <TableCell>{student.phone_number}</TableCell>
                                <TableCell>{student.branch.branch_name}</TableCell>
                                <TableCell>
                                    {student.enrollments.map(e => e.course.name).join(", ")}
                                </TableCell>
                                <TableCell className="flex gap-2">
                                    <PaymentDialog
                                        studentId={student.id}
                                        studentName={student.full_name}
                                        trigger={
                                            <Button variant="ghost" size="icon" title="Make Payment">
                                                <DollarSign className="h-4 w-4" />
                                            </Button>
                                        }
                                        onSuccess={() => router.refresh()}
                                    />
                                    <PaymentRecordsDialog
                                        studentId={student.id}
                                        studentName={student.full_name}
                                        trigger={
                                            <Button variant="ghost" size="icon" title="Payment Records">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        }
                                    />
                                    <StudentDialog
                                        student={student}
                                        courses={courses}
                                        branches={branches}
                                        userRole={userRole}
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
                                                    This action cannot be undone. This will permanently delete the student and remove their data from our servers.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(student.id)} className="bg-red-500 hover:bg-red-600">
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        {students.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center">
                                    No students found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile List (Cards) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {students.map((student) => (
                    <div key={student.id} className="p-4 border rounded-lg space-y-3 bg-card shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{student.full_name}</h3>
                                <p className="text-sm text-muted-foreground">{student.student_id}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <PaymentDialog
                                    studentId={student.id}
                                    studentName={student.full_name}
                                    trigger={
                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                            <DollarSign className="h-4 w-4" />
                                        </Button>
                                    }
                                    onSuccess={() => router.refresh()}
                                />
                                <PaymentRecordsDialog
                                    studentId={student.id}
                                    studentName={student.full_name}
                                    trigger={
                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                                <StudentDialog
                                    student={student}
                                    courses={courses}
                                    branches={branches}
                                    userRole={userRole}
                                    trigger={
                                        <Button variant="outline" size="icon" className="h-8 w-8">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    }
                                    onSuccess={() => router.refresh()}
                                />
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the student.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(student.id)} className="bg-red-500 hover:bg-red-600">
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="text-muted-foreground font-medium">Phone</p>
                                <p>{student.phone_number}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground font-medium">Branch</p>
                                <p>{student.branch.branch_name}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-muted-foreground font-medium">Courses</p>
                                <p className="flex flex-wrap gap-1">
                                    {student.enrollments.map(e => (
                                        <span key={e.courseId} className="bg-secondary px-2 py-0.5 rounded-full text-[10px]">
                                            {e.course.name}
                                        </span>
                                    ))}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {students.length === 0 && (
                    <div className="p-8 text-center border rounded-lg text-muted-foreground">
                        No students found.
                    </div>
                )}
            </div>
        </div>
    );
}
