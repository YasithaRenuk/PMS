"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { MultiSelect } from "@/components/ui/multi-select";
import {
  createStudent,
  updateStudent,
} from "@/app/actions/student-actions";
import { Role } from "@/app/generated/prisma/enums";
import { toast } from "sonner";

type Branch = {
  id: number;
  branch_name: string;
};

type Course = {
  id: number;
  name: string;
};

type Student = {
  id: number;
  full_name: string;
  phone_number: string;
  student_id: string;
  branchId: number;
  enrollments?: { courseId: number }[];
};

interface StudentDialogProps {
  student?: Student;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  branches: Branch[];
  courses: Course[];
  userRole: Role;
}

export function StudentDialog({
  student,
  trigger,
  open,
  onOpenChange,
  onSuccess,
  branches,
  courses,
  userRole,
}: StudentDialogProps) {
  const [fullName, setFullName] = useState(student?.full_name || "");
  const [phoneNumber, setPhoneNumber] = useState(student?.phone_number || "");
  const [studentId, setStudentId] = useState(student?.student_id || "");
  const [branchId, setBranchId] = useState(
    student?.branchId?.toString() || ""
  );

  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(
    student?.enrollments?.map((e) => e.courseId.toString()) || []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);

  const isEdit = !!student;
  const effectiveOpen = open !== undefined ? open : internalOpen;
  const setEffectiveOpen = onOpenChange || setInternalOpen;
  const isSuperAdmin = userRole === Role.superAdmin;

  useEffect(() => {
    if (effectiveOpen) {
      if (!student) {
        setFullName("");
        setPhoneNumber("");
        setStudentId("");
        setBranchId("");
        setSelectedCourseIds([]);
        setPhoneError("");
      } else {
        setFullName(student.full_name);
        setPhoneNumber(student.phone_number);
        setStudentId(student.student_id);
        setBranchId(student.branchId.toString());
        setSelectedCourseIds(
          student.enrollments?.map((e) => e.courseId.toString()) || []
        );
        setPhoneError("");
      }
    }
  }, [effectiveOpen, student]);

  // ✅ Sri Lankan phone number validation
  const validatePhoneNumber = (value: string) => {
    const regex = /^07\d{8}$/;
    return regex.test(value);
  };

  const handlePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    // Allow only digits
    if (!/^\d*$/.test(value)) return;

    setPhoneNumber(value);

    if (!validatePhoneNumber(value)) {
      setPhoneError(
        "Enter a valid phone number (07XXXXXXXX)"
      );
    } else {
      setPhoneError("");
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!validatePhoneNumber(phoneNumber)) {
        throw new Error(
          "Invalid phone number. Use 07XXXXXXXX format."
        );
      }

      if (selectedCourseIds.length === 0) {
        throw new Error("Select at least one course");
      }

      if (isSuperAdmin && !branchId) {
        throw new Error("Branch is required");
      }

      const data = {
        full_name: fullName,
        phone_number: phoneNumber,
        student_id: studentId,
        branchId: isSuperAdmin ? parseInt(branchId) : undefined,
        courseIds: selectedCourseIds.map((id) => parseInt(id)),
      };

      const result = isEdit
        ? await updateStudent(student.id, data)
        : await createStudent(data);

      if (!result.success) {
        throw new Error(result.error || "Failed to save student");
      }

      toast.success(isEdit ? "Student updated successfully" : "Student created successfully");
      setEffectiveOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const courseOptions = courses.map((c) => ({
    label: c.name,
    value: c.id.toString(),
  }));

  return (
    <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl overflow-visible">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Student Details" : "Register New Student"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {error && (
            <p className="text-destructive text-sm font-medium bg-destructive/10 p-3 rounded-md">{error}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="John Doe"
                      className="bg-muted/30 focus:bg-background pl-9"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      maxLength={10}
                      required
                      placeholder="07XXXXXXXX"
                      className={`bg-muted/30 focus:bg-background pl-9 ${phoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    </div>
                  </div>
                  {phoneError && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {phoneError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* divider */}
            <div className="md:col-span-2 border-t" />

            {/* Academic Information */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Academic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <div className="relative">
                    <Input
                      id="studentId"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                      placeholder="ST-0001"
                      className="bg-muted/30 focus:bg-background pl-9 font-mono"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /></svg>
                    </div>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
                      <SelectTrigger className="bg-muted/30 focus:bg-background">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem
                            key={branch.id}
                            value={branch.id.toString()}
                          >
                            {branch.branch_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className={`space-y-2 ${isSuperAdmin ? "md:col-span-2" : "md:col-span-1"}`}>
                  <Label>Enrolled Courses</Label>
                  <MultiSelect
                    options={courseOptions}
                    selected={selectedCourseIds}
                    onChange={setSelectedCourseIds}
                    placeholder="Select courses..."
                    className="bg-muted/30"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEffectiveOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="px-8 shadow-sm">
              {loading ? "Saving..." : "Save Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}