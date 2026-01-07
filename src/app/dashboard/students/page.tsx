import { getStudents } from "@/app/actions/student-actions";
import { getServerAuthSession } from "@/lib/auth";
import { StudentList } from "@/components/students/student-list";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function StudentsPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams;
    const session = await getServerAuthSession();
    if (!session) {
        redirect("/login");
    }

    const branchIdParam = searchParams.branchId;
    const courseIdParam = searchParams.courseId;
    const searchParam = searchParams.query;

    const filter = {
        branchId: branchIdParam && branchIdParam !== "all" ? parseInt(branchIdParam as string) : undefined,
        courseId: courseIdParam && courseIdParam !== "all" ? parseInt(courseIdParam as string) : undefined,
        query: searchParam as string | undefined,
    };

    const { data: students, success } = await getStudents(filter);

    const [branches, courses] = await Promise.all([
        prisma.branch.findMany({
            where: { deletedAt: null },
            select: { id: true, branch_name: true },
            orderBy: { branch_name: 'asc' }
        }),
        prisma.course.findMany({
            where: { deletedAt: null },
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    ]);

    if (!success) {
        return <div>Failed to load students.</div>;
    }

    return (
        <div className="space-y-2 pb-1">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Students</h1>
                </div>
            </header>

            <StudentList
                students={(students as any) || []}
                branches={branches}
                courses={courses}
                userRole={session.user.role}
            />
        </div>
    );
}
