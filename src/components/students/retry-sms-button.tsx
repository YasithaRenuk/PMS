"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFailedSmsPayments, retrySms } from "@/app/actions/payment-actions";
import { Loader2, MessageSquareWarning, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type FailedPayment = {
    id: number;
    fee: number;
    date: Date;
    time: string;
    student: {
        full_name: string;
        phone_number: string;
    };
};

export function RetrySmsButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
    const router = useRouter();

    const fetchFailedPayments = async () => {
        setLoading(true);
        const result = await getFailedSmsPayments();
        console.log("result",result);
        if (result.success && result.data) {
            setFailedPayments(result.data);
        }
        setLoading(false);
    };

    // Check for failed payments on mount
    useEffect(() => {
        fetchFailedPayments();
    }, []);

    const handleRetry = async () => {
        setSending(true);
        const ids = failedPayments.map(p => p.id);
        const result = await retrySms(ids);

        if (result.success && result.data) {
            toast.success(`Retry complete. Success: ${result.data.successCount}, Failed: ${result.data.failCount}`);
            // Refresh list
            await fetchFailedPayments();
            router.refresh();
            if (result.data.failCount === 0 && result.data.successCount > 0) {
                setOpen(false);
            }
        } else {
            toast.error(result.error || "Failed to retry SMS");
        }
        setSending(false);
    };

    if (loading) return null; // Or some small loading indicator? Better to just show nothing until we know.

    if (failedPayments.length === 0) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2" onClick={() => fetchFailedPayments()}>
                    <MessageSquareWarning className="h-4 w-4" />
                    Retry Failed SMS ({failedPayments.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Failed SMS Notifications</DialogTitle>
                    <DialogDescription>
                        The following payments have not received their SMS confirmation. Click 'Resend All' to retry.
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[300px] overflow-y-auto border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {failedPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">{payment.student.full_name}</TableCell>
                                    <TableCell>{payment.student.phone_number}</TableCell>
                                    <TableCell>LKR {payment.fee}</TableCell>
                                    <TableCell>{new Date(payment.date).toLocaleDateString()} {payment.time}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                        Cancel
                    </Button>
                    <Button onClick={handleRetry} disabled={sending}>
                        {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Resend All
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
