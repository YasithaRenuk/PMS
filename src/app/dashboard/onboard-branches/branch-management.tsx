"use client";

import { useState } from "react";
import { createBranch, deleteBranch, updateBranch } from "@/app/actions/branch";
import { useRouter } from "next/navigation";
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
import { Plus, Pencil, Trash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Branch = {
    id: number;
    branch_name: string;
    show_id: string;
    createdAt: Date;
    updatedAt: Date;
};

export function BranchManagement({ initialBranches }: { initialBranches: Branch[] }) {
    const router = useRouter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        branch_name: "",
        show_id: "",
    });

    const handleOpenCreate = () => {
        setEditingBranch(null);
        setFormData({ branch_name: "", show_id: "" });
        setError(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({ branch_name: branch.branch_name, show_id: branch.show_id });
        setError(null);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (editingBranch) {
                const res = await updateBranch(editingBranch.id, formData);
                if (!res.success) throw new Error(res.error);
            } else {
                const res = await createBranch(formData);
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
        if (!confirm("Are you sure you want to delete this branch?")) return;

        try {
            const res = await deleteBranch(id);
            if (!res.success) throw new Error(res.error);
            router.refresh();
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <>
            <div className="flex justify-end mb-6">
                <Button onClick={handleOpenCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Branch
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Branch Name</TableHead>
                            <TableHead>Show ID</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialBranches.map((branch) => (
                            <TableRow key={branch.id}>
                                <TableCell className="text-zinc-600">#{branch.id}</TableCell>
                                <TableCell className="font-medium text-zinc-900">{branch.branch_name}</TableCell>
                                <TableCell className="text-zinc-600">{branch.show_id}</TableCell>
                                <TableCell className="text-zinc-500">{new Date(branch.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {branch.id !== 1 && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEdit(branch)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(branch.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        {branch.id === 1 && (
                                            <Badge variant="secondary" className="italic text-zinc-400">Protected</Badge>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {initialBranches.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No branches found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBranch ? "Edit Branch" : "Create New Branch"}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="branch_name">Branch Name</Label>
                            <Input
                                id="branch_name"
                                value={formData.branch_name}
                                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                required
                                placeholder="e.g. Main Branch"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="show_id">Show ID</Label>
                            <Input
                                id="show_id"
                                value={formData.show_id}
                                onChange={(e) => setFormData({ ...formData, show_id: e.target.value })}
                                required
                                placeholder="e.g. BR-001"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : (editingBranch ? "Save Changes" : "Create Branch")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
