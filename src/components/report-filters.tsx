"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";

interface ReportFiltersProps {
    branches: { id: number; branch_name: string }[];
    courses: { id: number; name: string }[];
}

import { Input } from "@/components/ui/input";
import { Suspense } from "react";

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
        <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-8">
            <div className="w-full md:w-[200px]">
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Branch Filter</label>
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

            <div className="w-full md:w-[200px]">
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Course Filter</label>
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

            <div className="w-full md:w-[200px]">
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">Start Date</label>
                <Input
                    type="date"
                    value={selectedStartDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="bg-white"
                />
            </div>

            <div className="w-full md:w-[200px]">
                <label className="text-sm font-medium text-zinc-700 mb-1.5 block">End Date</label>
                <Input
                    type="date"
                    value={selectedEndDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="bg-white"
                />
            </div>
        </div>
    );
}
