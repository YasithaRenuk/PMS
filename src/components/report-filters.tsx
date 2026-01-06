"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

interface ReportFiltersProps {
    branches: { id: number; branch_name: string }[];
    courses: { id: number; name: string }[];
}

import { Input } from "@/components/ui/input";
import { Suspense } from "react";
import { Building2, BookOpen, Calendar } from "lucide-react";

export function ReportFilters(props: ReportFiltersProps) {
    return (
        <Suspense fallback={<div className="h-20 bg-zinc-50 animate-pulse rounded-md" />}>
            <FilterContent {...props} />
        </Suspense>
    );
}

function FilterContent({ branches, courses }: ReportFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const selectedBranchId = searchParams.get("branchId") || "all";
    const selectedCourseId = searchParams.get("courseId") || "all";
    const selectedStartDate = searchParams.get("startDate") || "";
    const selectedEndDate = searchParams.get("endDate") || "";

    function handleFilterChange(key: string, value: string) {
        console.log(`Filter change: ${key} = ${value}`);
        const params = new URLSearchParams(searchParams.toString());
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        const newUrl = `/dashboard/reports?${params.toString()}`;
        console.log(`Navigating to: ${newUrl}`);
        router.push(newUrl);
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-primary/20 p-6 rounded-xl border border-zinc-200 shadow-sm">
            <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Branch Filter
                </label>
                <Select value={selectedBranchId} onValueChange={(v) => handleFilterChange("branchId", v)}>
                    <SelectTrigger className="bg-white">
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

            <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Course Filter
                </label>
                <Select value={selectedCourseId} onValueChange={(v) => handleFilterChange("courseId", v)}>
                    <SelectTrigger className="bg-white">
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

            <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Start Date
                </label>
                <Input
                    type="date"
                    value={selectedStartDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="bg-white h-10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    End Date
                </label>
                <Input
                    type="date"
                    value={selectedEndDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="bg-white h-10 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
            </div>
        </div>
    );
}
