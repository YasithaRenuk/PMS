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
import { Pencil, Trash2, Search, DollarSign, Receipt } from "lucide-react";
import { useState, useCallback } from "react";

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
        if (!confirm("Are you sure you want to delete this student?")) return;

        const result = await deleteStudent(id);
        if (result.success) {
            router.refresh();
        } else {
            alert(result.error);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Students</h2>
                <StudentDialog
                    courses={courses}
                    branches={branches}
                    userRole={userRole}
                    trigger={<Button>Add Student</Button>}
                    onSuccess={() => router.refresh()}
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by Name, ID, or Phone..."
                        className="pl-8"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                {isSuperAdmin && (
                    <div className="w-[200px]">
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
                <div className="w-[200px]">
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

            <div className="rounded-md border">
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
                                                <Receipt className="h-4 w-4" />
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
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-600"
                                        onClick={() => handleDelete(student.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
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
        </div>
    );
}
