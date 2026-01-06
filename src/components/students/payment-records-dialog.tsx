"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStudentPayments } from "@/app/actions/payment-actions";
import { Loader2 } from "lucide-react";

interface Payment {
    id: number;
    fee: number;
    payment_method: string;
    date: Date;
    time: string;
    user: {
        id: number;
        username: string;
    };
}

interface PaymentRecordsDialogProps {
    studentId: number;
    studentName: string;
    trigger: React.ReactNode;
}

export function PaymentRecordsDialog({ studentId, studentName, trigger }: PaymentRecordsDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);

    useEffect(() => {
        if (open) {
            loadPayments();
        }
    }, [open]);

    async function loadPayments() {
        setLoading(true);
        const result = await getStudentPayments(studentId);
        if (result.success && result.data) {
            setPayments(result.data as Payment[]);
        } else {
            alert(result.error || "Failed to load payment records");
        }
        setLoading(false);
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Payment Records - {studentName}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Desktop Table */}
                        <div className="hidden md:block rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Added By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length > 0 ? (
                                        payments.map((payment) => (
                                            <TableRow key={payment.id}>
                                                <TableCell>{formatDate(payment.date)}</TableCell>
                                                <TableCell>{payment.time}</TableCell>
                                                <TableCell className="font-medium">Rs. {payment.fee.toFixed(2)}</TableCell>
                                                <TableCell>{payment.payment_method}</TableCell>
                                                <TableCell className="text-muted-foreground">{payment.user.username}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No payment records found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile List (Cards) */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {payments.length > 0 ? (
                                payments.map((payment) => (
                                    <div key={payment.id} className="p-3 border rounded-lg space-y-2 bg-card text-sm shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-base text-green-600">Rs. {payment.fee.toFixed(2)}</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(payment.date)} at {payment.time}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="bg-secondary px-2 py-0.5 rounded text-[10px] uppercase font-semibold">
                                                    {payment.payment_method}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-1 border-t text-[11px] text-muted-foreground">
                                            <span>Added By:</span>
                                            <span className="font-medium">{payment.user.username}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center border rounded-lg text-muted-foreground">
                                    No payment records found
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!loading && payments.length > 0 && (
                    <div className="flex justify-end pt-4 border-t">
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600">
                                Rs. {payments.reduce((sum, p) => sum + p.fee, 0).toFixed(2)}
                            </p>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
