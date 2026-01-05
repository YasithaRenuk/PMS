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
        <CourseList
            initialCourses={courses || []}
            userRole={session.user.role}
        />
    );
}
