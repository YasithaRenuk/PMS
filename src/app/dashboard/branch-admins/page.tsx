import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagement } from "./user-management";
import { getUsers } from "@/app/actions/user";
import { getBranches } from "@/app/actions/branch";

export default async function BranchAdminsPage() {
    const session = await getServerAuthSession();

    if (!session) {
        redirect("/login");
    }

    const [{ data: users }, { data: branches }] = await Promise.all([
        getUsers(),
        getBranches(),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Branch Admins</h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage system administrators and branch users.</p>
                </div>
            </div>

            <UserManagement
                initialUsers={users || []}
                branches={branches || []}
                currentUser={{
                    id: session.user.id,
                    role: session.user.role
                }}
            />
        </div>
    );
}
