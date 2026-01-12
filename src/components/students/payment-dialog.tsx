"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudentPaymentSummary, createPayment } from "@/app/actions/payment-actions";
import { Loader2, CreditCard, Banknote, Landmark, Globe, Receipt, Info, CheckCircle2, AlertCircle, History } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [selectedFeeId, setSelectedFeeId] = useState<string>("");
    const [formError, setFormError] = useState<string | null>(null);
    const [summary, setSummary] = useState<{
        totalFees: number;
        totalPaid: number;
        remainingBalance: number;
        enrolledCourses: {
            courseId: number;
            courseName: string;
            fee: number;
            feeBreakdown: { id: number; type: string; fee: number; paid: number; remaining: number }[];
        }[];
        systemFees: { id: number; name: string; amount: number; paid: number; remaining: number }[];
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
            setFormError(`Payment amount cannot exceed the total remaining balance (Rs. ${summary.remainingBalance.toFixed(2)})`);
            return;
        }

        // Specific fee validation
        if (selectedFeeId && summary) {
            if (selectedCourseId === "system") {
                const fee = summary.systemFees.find(f => f.id.toString() === selectedFeeId);
                if (fee && paymentAmount > fee.remaining) {
                    setFormError(`Payment amount cannot exceed the fee balance for ${fee.name} (Rs. ${fee.remaining.toFixed(2)})`);
                    return;
                }
            } else {
                const course = summary.enrolledCourses.find(c => c.courseId.toString() === selectedCourseId);
                const fee = course?.feeBreakdown.find(f => f.id.toString() === selectedFeeId);
                if (fee && paymentAmount > fee.remaining) {
                    setFormError(`Payment amount cannot exceed the fee balance for ${fee.type} (Rs. ${fee.remaining.toFixed(2)})`);
                    return;
                }
            }
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
            courseId: selectedCourseId && selectedCourseId !== "system" ? parseInt(selectedCourseId) : undefined,
            courseFeeId: selectedCourseId !== "system" && selectedFeeId ? parseInt(selectedFeeId) : undefined,
            systemFeeId: selectedCourseId === "system" && selectedFeeId ? parseInt(selectedFeeId) : undefined,
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
            <DialogContent className="sm:max-w-[550px] overflow-hidden p-0 rounded-3xl border-none shadow-2xl">
                <DialogHeader className="p-6 bg-zinc-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -ml-12 -mb-12" />

                    <DialogTitle className="flex flex-col gap-1 relative z-10">
                        <span className="text-2xl font-black tracking-tighter uppercase italic">Secure Checkout</span>
                        <div className="flex items-center gap-2 text-zinc-400 font-medium text-xs">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Processing payment for <span className="text-white">{studentName}</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="max-h-[85vh] overflow-y-auto px-6 py-6 custom-scrollbar bg-zinc-50/50">
                    {summaryLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="relative">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <div className="absolute inset-0 blur-sm bg-primary/20 animate-pulse rounded-full" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-wide uppercase">Reviewing financial standing...</p>
                        </div>
                    ) : summary ? (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Modern Invoice Summary Card */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em] flex items-center gap-2">
                                        <Receipt className="h-3 w-3" /> Statement of Account
                                    </h3>
                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">STUDENT ID: #{studentId}</span>
                                </div>

                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-zinc-200 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative bg-white rounded-2xl border border-zinc-100 shadow-xl overflow-hidden">
                                        <div className="p-5 space-y-6">
                                            {summary.enrolledCourses.length > 0 || summary.systemFees.length > 0 ? (
                                                <div className="space-y-5">
                                                    {/* System Fees Section */}
                                                    {summary.systemFees.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center bg-zinc-900/5 p-2 rounded-lg border border-zinc-200/50">
                                                                <span className="text-xs font-black text-primary uppercase italic tracking-tight flex items-center gap-2">
                                                                    <Globe className="h-3 w-3" /> General Fees
                                                                </span>
                                                            </div>
                                                            <div className="space-y-4 pl-1">
                                                                {summary.systemFees.map((f) => {
                                                                    const progress = (f.paid / f.amount) * 100;
                                                                    const isCleared = f.remaining <= 0;
                                                                    return (
                                                                        <div key={f.id} className="space-y-1.5 px-3 border-l-2 border-primary/30 hover:border-primary transition-colors">
                                                                            <div className="flex justify-between items-end">
                                                                                <div className="flex flex-col">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-tighter">{f.name}</span>
                                                                                        {isCleared && <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-50" />}
                                                                                    </div>
                                                                                    <div className="text-[9px] font-medium text-zinc-400">
                                                                                        Remittance: Rs. {f.paid.toLocaleString()} / {f.amount.toLocaleString()}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className={cn(
                                                                                        "text-[10px] font-mono font-black",
                                                                                        isCleared ? "text-emerald-600" : "text-zinc-900"
                                                                                    )}>
                                                                                        {isCleared ? "Rs. 0.00" : `Rs. ${f.remaining.toLocaleString()}`}
                                                                                    </span>
                                                                                    <span className="text-[8px] font-bold uppercase text-zinc-400 leading-none">Due</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={cn(
                                                                                        "h-full transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(var(--primary),0.3)]",
                                                                                        isCleared ? "bg-emerald-500" : "bg-primary"
                                                                                    )}
                                                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {summary.enrolledCourses.map((course) => (
                                                        <div key={course.courseId} className="space-y-3">
                                                            <div className="flex justify-between items-center bg-zinc-50/50 p-2 rounded-lg border border-zinc-100/50">
                                                                <span className="text-xs font-black text-zinc-900 uppercase italic tracking-tight">
                                                                    {course.courseName}
                                                                </span>
                                                                <span className="font-mono text-[10px] font-bold text-zinc-400">
                                                                    TOTAL: Rs. {course.fee.toLocaleString()}
                                                                </span>
                                                            </div>

                                                            <div className="space-y-4 pl-1">
                                                                {course.feeBreakdown.map((f) => {
                                                                    const progress = (f.paid / f.fee) * 100;
                                                                    const isCleared = f.remaining <= 0;
                                                                    return (
                                                                        <div key={f.id} className="space-y-1.5 px-3 border-l-2 border-zinc-100 hover:border-primary transition-colors">
                                                                            <div className="flex justify-between items-end">
                                                                                <div className="flex flex-col">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-tighter">{f.type}</span>
                                                                                        {isCleared && <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-50" />}
                                                                                    </div>
                                                                                    <div className="text-[9px] font-medium text-zinc-400">
                                                                                        Remittance: Rs. {f.paid.toLocaleString()} / {f.fee.toLocaleString()}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex flex-col items-end">
                                                                                    <span className={cn(
                                                                                        "text-[10px] font-mono font-black",
                                                                                        isCleared ? "text-emerald-600" : "text-zinc-900"
                                                                                    )}>
                                                                                        {isCleared ? "Rs. 0.00" : `Rs. ${f.remaining.toLocaleString()}`}
                                                                                    </span>
                                                                                    <span className="text-[8px] font-bold uppercase text-zinc-400 leading-none">Due</span>
                                                                                </div>
                                                                            </div>
                                                                            {/* High precision Progress Bar */}
                                                                            <div className="h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={cn(
                                                                                        "h-full transition-all duration-1000 ease-in-out shadow-[0_0_8px_rgba(var(--primary),0.3)]",
                                                                                        isCleared ? "bg-emerald-500" : "bg-primary"
                                                                                    )}
                                                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200">
                                                    <Info className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No active billings</p>
                                                </div>
                                            )}

                                            <div className="pt-4 mt-2 border-t border-zinc-100">
                                                <div className="grid grid-cols-2 gap-3 py-3 px-2 bg-zinc-900 rounded-xl">
                                                    <div className="flex flex-col items-center border-r border-zinc-800">
                                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Aggregate Fees</span>
                                                        <span className="text-sm font-mono font-black text-zinc-300 leading-none mt-1 italic">Rs. {summary.totalFees.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-widest">Total Collected</span>
                                                        <span className="text-sm font-mono font-black text-emerald-400 leading-none mt-1 italic">Rs. {summary.totalPaid.toLocaleString()}</span>
                                                    </div>
                                                </div>

                                                <div className={cn(
                                                    "mt-3 p-4 rounded-xl flex items-center justify-between border-2 transition-all duration-500",
                                                    summary.remainingBalance > 0
                                                        ? "bg-rose-50 border-rose-100 shadow-[inset_0_2px_4px_rgba(225,29,72,0.05)]"
                                                        : "bg-emerald-50 border-emerald-100"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn(
                                                            "p-2.5 rounded-lg shadow-lg rotate-3",
                                                            summary.remainingBalance > 0 ? "bg-rose-500 text-white shadow-rose-200" : "bg-emerald-500 text-white shadow-emerald-200"
                                                        )}>
                                                            {summary.remainingBalance > 0 ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                                                        </div>
                                                        <div className="-space-y-1">
                                                            <p className="text-[9px] font-black uppercase text-zinc-400 tracking-tighter">Current Outstanding</p>
                                                            <p className={cn(
                                                                "text-2xl font-black font-mono tracking-tighter italic",
                                                                summary.remainingBalance > 0 ? "text-rose-600" : "text-emerald-600"
                                                            )}>
                                                                Rs. {summary.remainingBalance.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest -rotate-6",
                                                        summary.remainingBalance > 0 ? "bg-white text-rose-500 border border-rose-200" : "bg-emerald-500 text-white"
                                                    )}>
                                                        {summary.remainingBalance > 0 ? "Payable" : "Settled"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Interaction Zone */}
                            <div className="space-y-6">
                                <div className="space-y-4 bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-4 bg-primary rounded-full" />
                                        <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-zinc-500">Remittance Entry</h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2 col-span-2">
                                            <Label htmlFor="course" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Course Allocation</Label>
                                            <Select
                                                value={selectedCourseId}
                                                onValueChange={(val) => {
                                                    setSelectedCourseId(val);
                                                    setSelectedFeeId("");
                                                    setFormError(null);
                                                }}
                                                required
                                            >
                                                <SelectTrigger id="course" className="h-12 rounded-2xl bg-zinc-50 border-none shadow-inner focus:ring-primary/20 transition-all font-bold text-zinc-900 px-4">
                                                    <SelectValue placeholder="Select target course" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl overflow-hidden shadow-2xl border-zinc-100 translate-y-1">
                                                    {summary.systemFees.length > 0 && (
                                                        <SelectItem value="system" className="py-4 px-4 focus:bg-primary/5 transition-colors border-b border-zinc-100 italic">
                                                            <div className="flex items-center justify-between w-full pr-6 gap-4">
                                                                <span className="font-bold tracking-tight text-primary uppercase">General Fees</span>
                                                                <span className="text-[8px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded-full tracking-widest">SYSTEM</span>
                                                            </div>
                                                        </SelectItem>
                                                    )}
                                                    {summary.enrolledCourses.map((course) => {
                                                        const isFullyPaid = course.feeBreakdown.every(f => f.remaining <= 0);
                                                        return (
                                                            <SelectItem
                                                                key={course.courseId}
                                                                value={course.courseId.toString()}
                                                                disabled={isFullyPaid}
                                                                className="py-4 px-4 focus:bg-primary/5 transition-colors"
                                                            >
                                                                <div className="flex items-center justify-between w-full pr-6 gap-4">
                                                                    <span className="font-bold tracking-tight">{course.courseName}</span>
                                                                    {isFullyPaid && <span className="text-[8px] bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full tracking-widest">COMPLETED</span>}
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label htmlFor="fee-type" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Fee Classification</Label>
                                            <Select
                                                value={selectedFeeId}
                                                onValueChange={(val) => {
                                                    setSelectedFeeId(val);
                                                    setFormError(null);
                                                    if (selectedCourseId === "system") {
                                                        const fee = summary.systemFees.find(f => f.id.toString() === val);
                                                        if (fee && (!amount || amount === "0" || amount === "")) {
                                                            setAmount(fee.remaining.toString());
                                                        }
                                                    } else {
                                                        const course = summary.enrolledCourses.find(c => c.courseId.toString() === selectedCourseId);
                                                        const fee = course?.feeBreakdown.find(f => f.id.toString() === val);
                                                        if (fee && (!amount || amount === "0" || amount === "")) {
                                                            setAmount(fee.remaining.toString());
                                                        }
                                                    }
                                                }}
                                                required
                                                disabled={!selectedCourseId}
                                            >
                                                <SelectTrigger id="fee-type" className="h-12 rounded-2xl bg-zinc-50 border-none shadow-inner disabled:opacity-40 font-bold px-4">
                                                    <SelectValue placeholder="Fee type" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl shadow-2xl translate-y-1">
                                                    {selectedCourseId === "system" ? (
                                                        summary.systemFees
                                                            .filter(f => f.remaining > 0)
                                                            .map((f) => (
                                                                <SelectItem key={f.id} value={f.id.toString()} className="py-3 px-4">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-bold tracking-tight leading-none">{f.name}</span>
                                                                        <span className="text-[9px] font-mono text-rose-500 font-bold">DUE: Rs. {f.remaining.toLocaleString()}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))
                                                    ) : (
                                                        summary.enrolledCourses
                                                            .find(c => c.courseId.toString() === selectedCourseId)
                                                            ?.feeBreakdown
                                                            .filter(f => f.remaining > 0)
                                                            .map((f) => (
                                                                <SelectItem key={f.id} value={f.id.toString()} className="py-3 px-4">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-bold tracking-tight leading-none">{f.type}</span>
                                                                        <span className="text-[9px] font-mono text-rose-500 font-bold">DUE: Rs. {f.remaining.toLocaleString()}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 col-span-2 sm:col-span-1">
                                            <Label htmlFor="amount" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Entry Amount</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black group-focus-within:scale-110 transition-transform text-sm italic">Rs.</div>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    step="100"
                                                    min="0"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={(e) => {
                                                        setAmount(e.target.value);
                                                        setFormError(null);
                                                    }}
                                                    required
                                                    className="h-12 pl-12 rounded-2xl bg-zinc-50 border-none shadow-inner focus:ring-primary/40 font-mono font-black text-zinc-900 text-lg italic"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 col-span-2 pt-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 pl-1">Transmission Channel</Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {[
                                                    { id: 'Cash', icon: Banknote },
                                                    { id: 'Card', icon: CreditCard },
                                                    { id: 'Bank Transfer', icon: Landmark },
                                                    { id: 'Online Payment', icon: Globe }
                                                ].map((method) => (
                                                    <button
                                                        key={method.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setPaymentMethod(method.id);
                                                            setFormError(null);
                                                        }}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all duration-300 gap-2 relative group overflow-hidden",
                                                            paymentMethod === method.id
                                                                ? "bg-zinc-900 text-white border-zinc-900 shadow-xl shadow-zinc-200 -translate-y-1"
                                                                : "bg-white text-zinc-400 border-zinc-50 hover:border-zinc-200 hover:text-zinc-600 shadow-sm"
                                                        )}
                                                    >
                                                        {paymentMethod === method.id && <div className="absolute top-0 right-0 w-6 h-6 bg-primary text-white rounded-bl-xl flex items-center justify-center animate-in zoom-in duration-300"><CheckCircle2 className="h-3.5 w-3.5 fill-current" /></div>}
                                                        <method.icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", paymentMethod === method.id ? "text-primary" : "")} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">{method.id.split(' ')[0]}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {formError && (
                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="p-1.5 rounded-full bg-rose-600 text-white"><AlertCircle className="h-3 w-3" /></div>
                                        <span className="uppercase tracking-tight leading-none">{formError}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setOpen(false)}
                                        className="rounded-2xl h-14 md:flex-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 font-bold uppercase tracking-widest text-[10px]"
                                    >
                                        Void Transaction
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={loading || !paymentMethod}
                                        className="h-14 md:flex-[2] rounded-2xl shadow-[0_10px_30px_rgba(var(--primary),0.15)] bg-primary hover:bg-zinc-900 hover:text-white transition-all duration-500 group relative overflow-hidden active:scale-[0.98]"
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        <div className="flex items-center justify-center gap-3 relative z-10">
                                            {loading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <History className="h-5 w-5 group-hover:rotate-12 transition-transform duration-500" />
                                            )}
                                            <span className="font-black italic uppercase tracking-wider text-sm">Seal & Post Remittance</span>
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="text-center py-24 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300">
                                <AlertCircle className="h-10 w-10" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-black text-zinc-900 italic uppercase">Information Vacuum</p>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest">No terminal data available for this student</p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
