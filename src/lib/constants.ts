export const FEE_TYPES = [
  "Entrance Fee",
  "Monthly Fee",
  "Cloth Fee",
  "Exam Fee",
  "Other"
] as const;

export type FeeType = (typeof FEE_TYPES)[number];
