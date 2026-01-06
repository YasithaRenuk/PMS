"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudentPaymentSummary, createPayment } from "@/app/actions/payment-actions";
import { Loader2 } from "lucide-react";

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
        enrolledCourses: { courseName: string; fee: number }[];
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Make Payment - {studentName}</DialogTitle>
                </DialogHeader>

                {summaryLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : summary ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Payment Summary */}
                        <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
                            <h3 className="font-semibold text-sm">Payment Summary</h3>

                            {summary.enrolledCourses.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Enrolled Courses:</p>
                                    <ul className="text-sm space-y-1 ml-4">
                                        {summary.enrolledCourses.map((course, idx) => (
                                            <li key={idx} className="flex justify-between">
                                                <span>{course.courseName}</span>
                                                <span className="font-medium">Rs. {course.fee.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-2 border-t space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Total Fees:</span>
                                    <span className="font-semibold">Rs. {summary.totalFees.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium">Already Paid:</span>
                                    <span className="font-semibold text-green-600">Rs. {summary.totalPaid.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base border-t pt-2">
                                    <span className="font-semibold">Remaining Balance:</span>
                                    <span className={`font-bold ${summary.remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        Rs. {summary.remainingBalance.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Form */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="amount">Payment Amount</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Enter amount to pay"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setFormError(null);
                                    }}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="payment-method">Payment Method</Label>
                                <Select
                                    value={paymentMethod}
                                    onValueChange={(val) => {
                                        setPaymentMethod(val);
                                        setFormError(null);
                                    }}
                                    required
                                >
                                    <SelectTrigger id="payment-method">
                                        <SelectValue placeholder="Select payment method" />
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
                            <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
                                {formError}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Pay
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center py-4 text-muted-foreground">
                        Failed to load payment information
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
