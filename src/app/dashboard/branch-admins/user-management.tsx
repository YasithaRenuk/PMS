"use client";

import { useState } from "react";
import { createUser, deleteUser, updateUser } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { Role } from "@/app/generated/prisma/enums";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type User = {
    id: number;
    username: string;
    role: Role;
    branchId: number | null;
    branch?: {
        branch_name: string;
    } | null;
    createdAt: Date;
};

type Branch = {
    id: number;
    branch_name: string;
};

type CurrentUser = {
    id: string;
    role: Role;
}

export function UserManagement({ initialUsers, branches, currentUser }: { initialUsers: User[], branches: Branch[], currentUser: CurrentUser }) {
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        role: "admin" as Role,
        branchId: "" as string,
    });

    const isSuperAdmin = currentUser.role === Role.superAdmin;

    const handleOpenCreate = () => {
        setEditingUser(null);
        setFormData({
            username: "",
            password: "",
            role: Role.admin,
            branchId: ""
        });
        setError(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: "",
            role: user.role,
            branchId: user.branchId ? user.branchId.toString() : ""
        });
        setError(null);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const payload = {
                username: formData.username,
                role: formData.role,
                branchId: formData.branchId ? parseInt(formData.branchId) : null,
                ...(formData.password ? { password: formData.password } : {}),
            };

            if (editingUser) {
                if (editingUser.id === 1) {
                    // Logic for ID 1 protection if needed
                }

                const res = await updateUser(editingUser.id, payload);
                if (!res.success) throw new Error(res.error);
            } else {
                if (!formData.password) throw new Error("Password is required for new users");
                const createPayload = {
                    ...payload,
                    password: formData.password
                };
                const res = await createUser(createPayload);
                if (!res.success) throw new Error(res.error);
            }
            setIsDialogOpen(false);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            const res = await deleteUser(id);
            if (!res.success) throw new Error(res.error);
            router.refresh();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const isId1 = editingUser?.id === 1;
    const isSelf = editingUser && editingUser.id.toString() === currentUser.id;
    const canDelete = isSuperAdmin;
    const canEditRoleAndBranch = isSuperAdmin && !isId1;

    return (
        <>
            <div className="flex justify-end mb-6">
                {isSuperAdmin && (
                    <Button onClick={handleOpenCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add New User
                    </Button>
                )}
            </div>

            <div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialUsers.map((user) => {
                            const isUserSelf = user.id.toString() === currentUser.id;
                            const showEdit = isSuperAdmin || isUserSelf;
                            const showDelete = isSuperAdmin && user.id !== 1;

                            return (
                                <TableRow key={user.id}>
                                    <TableCell>#{user.id}</TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {user.username}
                                        {user.id === 1 && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Super Admin</Badge>}
                                        {isUserSelf && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">You</Badge>}
                                    </TableCell>
                                    <TableCell className="capitalize">{user.role}</TableCell>
                                    <TableCell>{user.branch?.branch_name || "-"}</TableCell>
                                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {showEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEdit(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {showDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">
                                Password {editingUser && <span className="text-zinc-500 font-normal text-xs ml-2">(Leave blank to keep current)</span>}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                disabled={!canEditRoleAndBranch}
                                value={formData.role}
                                onValueChange={(val) => setFormData({ ...formData, role: val as Role })}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={Role.admin}>Admin</SelectItem>
                                    <SelectItem value={Role.superAdmin}>Super Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            {!canEditRoleAndBranch && isSuperAdmin && <p className="text-xs text-amber-600">Locked for Super Admin (ID 1)</p>}
                            {!isSuperAdmin && <p className="text-xs text-zinc-500">You cannot change your role.</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="branch">Assigned Branch</Label>
                            <Select
                                disabled={!canEditRoleAndBranch}
                                value={formData.branchId}
                                onValueChange={(val) => setFormData({ ...formData, branchId: val })}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Select a branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map(b => (
                                        <SelectItem key={b.id} value={b.id.toString()}>{b.branch_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!canEditRoleAndBranch && isSuperAdmin && <p className="text-xs text-amber-600">Locked for Super Admin (ID 1)</p>}
                            {!isSuperAdmin && <p className="text-xs text-zinc-500">You cannot change your branch.</p>}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : (editingUser ? "Save Changes" : "Create User")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
