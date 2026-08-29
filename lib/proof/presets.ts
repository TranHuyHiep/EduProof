// Ready-made claim sets for the situations people actually hit.
//
// They exist because a blank builder is a bad first screen: most students want
// one of three things, and seeing them named makes the point of the product
// obvious faster than any explanation.

import type { ClaimRequest } from "@/types";

export interface ClaimPreset {
  id: string;
  name: string;
  /** The real-world situation, in the words the student would use. */
  context: string;
  claims: ClaimRequest[];
}

export const PRESETS: ClaimPreset[] = [
  {
    id: "student-discount",
    name: "Student discount",
    context: "A shop needs to know you are enrolled — nothing else.",
    claims: [{ attribute: "status", operator: "==", operand: "active" }],
  },
  {
    id: "scholarship",
    name: "Scholarship application",
    context: "A board checks a grade threshold without reading your transcript.",
    claims: [
      { attribute: "status", operator: "==", operand: "active" },
      { attribute: "gpa", operator: ">=", operand: 3.5 },
    ],
  },
  {
    id: "internship",
    name: "Internship screening",
    context: "An employer confirms your programme and year before interviewing.",
    claims: [
      { attribute: "degree", operator: "==", operand: "Bachelor" },
      { attribute: "major", operator: "==", operand: "Computer Science" },
      { attribute: "academicYear", operator: ">=", operand: 3 },
    ],
  },
];
