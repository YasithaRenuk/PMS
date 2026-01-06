import { getPaymentReports } from "@/app/actions/payment-actions";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@/app/generated/prisma/enums";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Building2, BookOpen } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ReportFilters } from "@/components/report-filters";

export const dynamic = 'force-dynamic';

export default async function ReportsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const session = await getServerAuthSession();
    if (!session || session.user.role !== Role.superAdmin) {
        redirect("/dashboard/students");
    }

    const getSingleParam = (param: string | string[] | undefined) => {
        if (Array.isArray(param)) return param[0];
        return param;
    };

    const branchIdParam = getSingleParam(searchParams.branchId);
    const courseIdParam = getSingleParam(searchParams.courseId);
    const startDateParam = getSingleParam(searchParams.startDate);
    const endDateParam = getSingleParam(searchParams.endDate);

    console.log("--- ReportsPage Server Render ---");
    console.log("Query Params:", { branchIdParam, courseIdParam });

    const filters = {
        branchId: branchIdParam && branchIdParam !== "all" && !isNaN(parseInt(branchIdParam)) ? parseInt(branchIdParam) : undefined,
        courseId: courseIdParam && courseIdParam !== "all" && !isNaN(parseInt(courseIdParam)) ? parseInt(courseIdParam) : undefined,
        startDate: startDateParam || undefined,
        endDate: endDateParam || undefined,
    };

    console.log("Constructed Filters:", filters);

    const [{ data: reports, success, error }, branches, courses] = await Promise.all([
        getPaymentReports(filters),
        prisma.branch.findMany({ where: { deletedAt: null }, select: { id: true, branch_name: true }, orderBy: { branch_name: 'asc' } }),
        prisma.course.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    ]);

    if (!success || !reports) {
        return (
            <div className="space-y-6">
                <header>
                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                    <p className="text-zinc-500 mt-2">Comprehensive overview of payments across all branches and courses.</p>
                </header>
                <ReportFilters branches={branches} courses={courses} />
                <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-200">
                    {error || "Failed to load reports."}
                </div>
            </div>
        );
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
        }).format(amount);
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                <p className="text-zinc-500 mt-2">Comprehensive overview of payments across all branches and courses.</p>
            </header>

            <ReportFilters branches={branches} courses={courses} />

            {/* Overview Card */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white shadow-sm border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-600">Filtered Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-900">{formatCurrency(reports.totalRevenue)}</div>
                        <p className="text-xs text-zinc-500 mt-1">Based on selected filters</p>
                    </CardContent>
                </Card>

                <Card className="bg-white shadow-sm border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-600">Active Branches in View</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-900">{reports.branchTotals.length}</div>
                        <p className="text-xs text-zinc-500 mt-1">Collecting revenue</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Branch-wise breakdown */}
                <Card className="bg-white shadow-sm border-zinc-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-zinc-400" />
                            Branch-wise Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Branch Name</TableHead>
                                    <TableHead className="text-right">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.branchTotals.map((branch: any) => (
                                    <TableRow key={branch.name}>
                                        <TableCell className="font-medium">{branch.name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(branch.total)}</TableCell>
                                    </TableRow>
                                ))}
                                {reports.branchTotals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-zinc-400 py-4">No data available for filters</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Course-wise breakdown */}
                <Card className="bg-white shadow-sm border-zinc-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-zinc-400" />
                            Course-wise Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course Name</TableHead>
                                    <TableHead className="text-right">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.courseTotals.map((course: any) => (
                                    <TableRow key={course.name}>
                                        <TableCell className="font-medium">{course.name}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(course.total)}</TableCell>
                                    </TableRow>
                                ))}
                                {reports.courseTotals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-zinc-400 py-4">No data available for filters</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
