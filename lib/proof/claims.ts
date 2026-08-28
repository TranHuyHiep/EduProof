import type { ClaimRequest, ClaimResult, Student } from "@/types";

/** The claim menu offered in the UI. Operands are chosen by the student. */
export const CLAIM_CATALOG: Array<{
  type: ClaimRequest["type"];
  attribute: ClaimRequest["attribute"];
  operator: ClaimRequest["operator"];
  title: string;
  defaultOperand: string | number;
  options?: Array<string | number>;
}> = [
  {
    type: "student_status",
    attribute: "status",
    operator: "==",
    title: "I am currently an active student",
    defaultOperand: "active",
  },
  {
    type: "gpa_threshold",
    attribute: "gpa",
    operator: ">=",
    title: "My GPA is at least",
    defaultOperand: 3.5,
    options: [2.5, 3.0, 3.5],
  },
  {
    type: "academic_year_threshold",
    attribute: "academicYear",
    operator: ">=",
    title: "I am at least in year",
    defaultOperand: 3,
    options: [1, 2, 3, 4],
  },
  {
    type: "degree",
    attribute: "degree",
    operator: "==",
    title: "My degree is",
    defaultOperand: "Bachelor",
    options: ["Bachelor", "Master", "PhD"],
  },
  {
    type: "major",
    attribute: "major",
    operator: "==",
    title: "My major is",
    defaultOperand: "Computer Science",
    options: [
      "Computer Science",
      "Mathematics",
      "Data Science",
      "Physics",
      "Electrical Engineering",
      "Business Administration",
    ],
  },
];

/** `gpa >= 3.5` — the predicate as written, with no private value. */
export function statementOf(claim: ClaimRequest): string {
  return `${claim.attribute} ${claim.operator} ${claim.operand}`;
}

/** Verifier-facing wording. */
export function labelOf(claim: ClaimRequest): string {
  switch (claim.type) {
    case "student_status":
      return `Currently an ${claim.operand} student`;
    case "gpa_threshold":
      return `GPA is at least ${Number(claim.operand).toFixed(1)}`;
    case "academic_year_threshold":
      return `In academic year ${claim.operand} or above`;
    case "degree":
      return `Holds a ${claim.operand} degree`;
    case "major":
      return `Major is ${claim.operand}`;
  }
}

/**
 * Evaluates a predicate against the student record.
 *
 * In the Midnight build this comparison happens INSIDE the circuit, over a
 * private witness. Here it runs in plain TypeScript — same truth value, no
 * zero-knowledge property. Only the boolean ever leaves this function.
 */
export function evaluateClaim(student: Student, claim: ClaimRequest): ClaimResult {
  let satisfied = false;

  switch (claim.type) {
    case "student_status":
      satisfied = student.status === claim.operand;
      break;
    case "gpa_threshold":
      satisfied = student.gpa >= Number(claim.operand);
      break;
    case "academic_year_threshold":
      satisfied = student.academicYear >= Number(claim.operand);
      break;
    case "degree":
      satisfied = student.degree === claim.operand;
      break;
    case "major":
      satisfied = student.major === claim.operand;
      break;
  }

  return { ...claim, satisfied, statement: statementOf(claim), label: labelOf(claim) };
}
