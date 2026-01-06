import { getCourses } from "@/app/actions/course-actions";
import { getServerAuthSession } from "@/lib/auth";
import { CourseList } from "@/components/courses/course-list";
import { redirect } from "next/navigation";

export default async function CoursesPage() {
    const session = await getServerAuthSession();
    if (!session) {
        redirect("/login");
    }

    const { data: courses, success } = await getCourses();

    if (!success) {
        return <div>Failed to load courses.</div>;
    }

    return (
        <div className="space-y-2 pb-1">
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Courses</h1>
                </div>
            </header>

            <CourseList
                initialCourses={courses || []}
                userRole={session.user.role}
            />
        </div>
    );
}
