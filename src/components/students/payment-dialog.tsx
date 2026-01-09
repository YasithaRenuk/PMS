"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudentPaymentSummary, createPayment } from "@/app/actions/payment-actions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentDialogProps {
    studentId: number;
    studentName: string;
    trigger: React.ReactNode;
    onSuccess?: () => void;
}

export function PaymentDialog({ studentId, studentName, trigger, onSuccess }: PaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{
        totalFees: number;
        totalPaid: number;
        remainingBalance: number;
        enrolledCourses: {
            courseName: string;
            fee: number;
            feeBreakdown: { type: string; fee: number }[];
        }[];
    } | null>(null);

    // Load payment summary when dialog opens
    useEffect(() => {
        if (open) {
            setFormError(null);
            loadSummary();
        }
    }, [open]);

    async function loadSummary() {
        setSummaryLoading(true);
        const result = await getStudentPaymentSummary(studentId);
        if (result.success && result.data) {
            setSummary(result.data);
        } else {
            alert(result.error || "Failed to load payment summary");
        }
        setSummaryLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const paymentAmount = parseFloat(amount);
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            setFormError("Please enter a valid payment amount");
            return;
        }

        if (summary && paymentAmount > summary.remainingBalance) {
            setFormError(`Payment amount cannot exceed the remaining balance (Rs. ${summary.remainingBalance.toFixed(2)})`);
            return;
        }

        if (!paymentMethod) {
            setFormError("Please select a payment method");
            return;
        }

        setFormError(null);

        setLoading(true);
        const result = await createPayment({
            studentId,
            amount: paymentAmount,
            paymentMethod,
        });

        if (result.success) {
            toast.success("Payment processed successfully");
            setOpen(false);
            setAmount("");
            setPaymentMethod("");
            onSuccess?.();
        } else {
            alert(result.error || "Failed to create payment");
        }
        setLoading(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px] overflow-hidden">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <span>Make Payment</span>
                        <span className="text-muted-foreground font-normal text-sm border-l pl-2 ml-2">
                            {studentName}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                {summaryLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading payment details...</p>
                    </div>
                ) : summary ? (
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                        {/* Payment Summary Receipt */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" /><path d="M10 13h4" /><path d="M10 17h4" /><path d="M10 9h4" /></svg>
                                <h3 className="font-medium text-sm text-muted-foreground">Invoice Summary</h3>
                            </div>

                            <div className="p-4 space-y-4">
                                {summary.enrolledCourses.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Courses</p>
                                        <ul className="text-sm space-y-3">
                                            {summary.enrolledCourses.map((course, idx) => (
                                                <li key={idx} className="space-y-1 group border-b border-muted pb-2 last:border-0 last:pb-0">
                                                    <div className="flex justify-between items-center text-zinc-800 font-medium">
                                                        <span>{course.courseName}</span>
                                                        <span className="font-mono">Rs. {course.fee.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1 pl-3 border-l-2 border-muted/50">
                                                        {course.feeBreakdown.map((f, fIdx) => (
                                                            <div key={fIdx} className="flex justify-between text-[11px] text-zinc-500">
                                                                <span>{f.type}</span>
                                                                <span className="font-mono">Rs. {f.fee.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-dashed space-y-2">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Total Fees</span>
                                        <span className="font-mono">Rs. {summary.totalFees.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Paid Amount</span>
                                        <span className="font-mono">- Rs. {summary.totalPaid.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-base border-t pt-3 mt-2">
                                        <span className="font-semibold">Balance Due</span>
                                        <span className={`font-bold font-mono ${summary.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            Rs. {summary.remainingBalance.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Form */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label htmlFor="amount">Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                        Rs.
                                    </span>
                                    <Input
                                        id="amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setFormError(null);
                                        }}
                                        required
                                        className="pl-9 bg-muted/30 focus:bg-background"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label htmlFor="payment-method">Method</Label>
                                <Select
                                    value={paymentMethod}
                                    onValueChange={(val) => {
                                        setPaymentMethod(val);
                                        setFormError(null);
                                    }}
                                    required
                                >
                                    <SelectTrigger id="payment-method" className="bg-muted/30 focus:bg-background">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash">Cash</SelectItem>
                                        <SelectItem value="Card">Card</SelectItem>
                                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="Online Payment">Online Payment</SelectItem>
                                        <SelectItem value="Cheque">Cheque</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {formError && (
                            <div className="p-3 rounded-md bg-destructive/15 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                                {formError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="px-6 shadow-sm">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Process Payment
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                        <p>No payment information available.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
