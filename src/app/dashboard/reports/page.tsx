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
        <div className="space-y-10 pb-10">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Reports</h1>
                    <p className="text-zinc-500 mt-2 text-lg">Comprehensive overview of payments across all branches and courses.</p>
                </div>
            </header>

            <ReportFilters branches={branches} courses={courses} />

            {/* Overview Card */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card accent className="bg-primary/5 shadow-md border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Filtered Revenue</CardTitle>
                        <div className="p-2 bg-green-50 rounded-lg">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-4xl font-bold text-zinc-900">{formatCurrency(reports.totalRevenue)}</div>
                        <div className="mt-4 flex items-center gap-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0 text-[10px] font-bold uppercase transition-none">Live Data</Badge>
                            <p className="text-xs text-zinc-500">Based on selected filters</p>
                        </div>
                    </CardContent>
                </Card>

                <Card accent className="bg-primary/5 shadow-md border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Active Branches in View</CardTitle>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-4xl font-bold text-zinc-900">{reports.branchTotals.length}</div>
                        <div className="mt-4 flex items-center gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0 text-[10px] font-bold uppercase transition-none">Active</Badge>
                            <p className="text-xs text-zinc-500">Collecting revenue</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="bg-primary/5 shadow-md border-zinc-200">
                    <CardHeader className="border-b border-zinc-50 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-3 text-zinc-800">
                            <div className="p-2 bg-zinc-100 rounded-lg">
                                <Building2 className="h-5 w-5 text-zinc-600" />
                            </div>
                            Branch-wise Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-zinc-100">
                                    <TableHead className="font-bold text-zinc-900">Branch Name</TableHead>
                                    <TableHead className="text-right font-bold text-zinc-900">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.branchTotals.map((branch: any) => (
                                    <TableRow key={branch.name} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                                        <TableCell className="font-medium text-zinc-700">{branch.name}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">{formatCurrency(branch.total)}</TableCell>
                                    </TableRow>
                                ))}
                                {reports.branchTotals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-zinc-400 py-10">No data available for filters</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 shadow-md border-zinc-200">
                    <CardHeader className="border-b border-zinc-50 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-3 text-zinc-800">
                            <div className="p-2 bg-zinc-100 rounded-lg">
                                <BookOpen className="h-5 w-5 text-zinc-600" />
                            </div>
                            Course-wise Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-zinc-100">
                                    <TableHead className="font-bold text-zinc-900">Course Name</TableHead>
                                    <TableHead className="text-right font-bold text-zinc-900">Total Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.courseTotals.map((course: any) => (
                                    <TableRow key={course.name} className="border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                                        <TableCell className="font-medium text-zinc-700">{course.name}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">{formatCurrency(course.total)}</TableCell>
                                    </TableRow>
                                ))}
                                {reports.courseTotals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center text-zinc-400 py-10">No data available for filters</TableCell>
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
