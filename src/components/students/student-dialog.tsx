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
      <DialogContent className="max-w-md overflow-visible">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Student" : "Add Student"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={phoneNumber}
              onChange={handlePhoneChange}
              maxLength={10}
              required
            />
            {phoneError && (
              <p className="text-sm text-red-500">
                {phoneError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              required
            />
          </div>

          {isSuperAdmin && (
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
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

          <div className="space-y-2">
            <Label>Courses</Label>
            <MultiSelect
              options={courseOptions}
              selected={selectedCourseIds}
              onChange={setSelectedCourseIds}
              placeholder="Select courses..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEffectiveOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}