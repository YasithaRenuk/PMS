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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { Plus, Pencil, Trash, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

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
    const [showPassword, setShowPassword] = useState(false);

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
                toast.success("User updated successfully");
            } else {
                if (!formData.password) throw new Error("Password is required for new users");
                const createPayload = {
                    ...payload,
                    password: formData.password
                };
                const res = await createUser(createPayload);
                if (!res.success) throw new Error(res.error);
                toast.success("User created successfully");
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
        // Confirmation is now handled by AlertDialog


        try {
            const res = await deleteUser(id);
            if (!res.success) throw new Error(res.error);
            toast.success("User deleted successfully");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete user");
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
                    <Button onClick={handleOpenCreate} className="shadow-sm">
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
                                    <TableCell className="text-zinc-600">#{user.id}</TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {user.username}
                                        {user.id === 1 && <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">Super Admin</Badge>}
                                        {isUserSelf && <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200">You</Badge>}
                                    </TableCell>
                                    <TableCell className="capitalize text-zinc-700">{user.role}</TableCell>
                                    <TableCell className="text-zinc-600">{user.branch?.branch_name || "-"}</TableCell>
                                    <TableCell className="text-zinc-500">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
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
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the user account.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-red-500 hover:bg-red-600">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
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
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                    placeholder="johndoe"
                                    className="bg-muted/30 focus:bg-background"
                                />
                            </div>

                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label htmlFor="password">
                                    Password {editingUser && <span className="text-zinc-500 font-normal text-xs">(Optional)</span>}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        placeholder="••••••••"
                                        className="bg-muted/30 focus:bg-background pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    disabled={!canEditRoleAndBranch}
                                    value={formData.role}
                                    onValueChange={(val) => setFormData({ ...formData, role: val as Role })}
                                >
                                    <SelectTrigger className="bg-muted/30 focus:bg-background">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={Role.admin}>Admin</SelectItem>
                                        <SelectItem value={Role.superAdmin}>Super Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                {canEditRoleAndBranch && (
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Super Admins have full access. Admins are restricted to their branch.
                                    </p>
                                )}
                                {!canEditRoleAndBranch && isSuperAdmin && <p className="text-xs text-amber-600">Locked for Super Admin (ID 1)</p>}
                                {!isSuperAdmin && <p className="text-xs text-zinc-500">You cannot change your role.</p>}
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="branch">Assigned Branch</Label>
                                <Select
                                    disabled={!canEditRoleAndBranch}
                                    value={formData.branchId}
                                    onValueChange={(val) => setFormData({ ...formData, branchId: val })}
                                >
                                    <SelectTrigger className="bg-muted/30 focus:bg-background">
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
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="shadow-sm">
                                {isLoading ? "Saving..." : (editingUser ? "Save Changes" : "Create User")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
