// The attribute registry: what a student can prove things about.
//
// This is the single source of truth for the claim builder. Adding an
// attribute means adding one entry here — the UI, the sentence wording, the
// operator menu and the evaluator all read from it.
//
// `slot` mirrors the field-vector layout in lib/school/canonical.ts. Wave 2's
// circuit is generic over (slot, operator, operand), so these numbers are part
// of the proving contract, not a display detail. Never renumber them.

import { SLOT } from "@/lib/school/canonical";
import type { AttributeSpec, ClaimOperator, PrivateAttribute } from "@/types";

export const ATTRIBUTES: AttributeSpec[] = [
  {
    id: "status",
    kind: "enum",
    slot: SLOT.STATUS,
    subject: "My student status",
    withheldLabel: "Enrolment status",
    operators: ["==", "!="],
    options: [
      { value: "active", label: "active" },
      { value: "graduated", label: "graduated" },
      { value: "suspended", label: "suspended" },
    ],
    defaultOperator: "==",
    defaultValue: "active",
  },
  {
    id: "gpa",
    kind: "number",
    slot: SLOT.GPA_SCALED,
    subject: "My GPA",
    withheldLabel: "Exact GPA",
    operators: [">=", ">", "<=", "<", "=="],
    range: { min: 0, max: 4, step: 0.1 },
    suggestions: [2.5, 3.0, 3.5, 3.8],
    // Stored ×100 so the comparison is integer arithmetic, as in the circuit.
    scale: 100,
    defaultOperator: ">=",
    defaultValue: 3.5,
  },
  {
    id: "academicYear",
    kind: "number",
    slot: SLOT.ACADEMIC_YEAR,
    subject: "My academic year",
    withheldLabel: "Academic year",
    operators: [">=", ">", "<=", "<", "==", "!="],
    range: { min: 1, max: 8, step: 1 },
    suggestions: [1, 2, 3, 4],
    defaultOperator: ">=",
    defaultValue: 3,
  },
  {
    id: "degree",
    kind: "enum",
    slot: SLOT.DEGREE,
    subject: "My degree",
    withheldLabel: "Degree programme",
    operators: ["==", "!="],
    options: [
      { value: "Bachelor", label: "a Bachelor's" },
      { value: "Master", label: "a Master's" },
      { value: "PhD", label: "a PhD" },
    ],
    defaultOperator: "==",
    defaultValue: "Bachelor",
  },
  {
    id: "major",
    kind: "enum",
    slot: SLOT.MAJOR,
    subject: "My field of study",
    withheldLabel: "Field of study",
    operators: ["==", "!="],
    options: [
      { value: "Computer Science", label: "Computer Science" },
      { value: "Mathematics", label: "Mathematics" },
      { value: "Data Science", label: "Data Science" },
      { value: "Physics", label: "Physics" },
      { value: "Electrical Engineering", label: "Electrical Engineering" },
      { value: "Business Administration", label: "Business Administration" },
    ],
    defaultOperator: "==",
    defaultValue: "Computer Science",
  },
];

const BY_ID = new Map(ATTRIBUTES.map((a) => [a.id, a]));

export function attributeSpec(id: PrivateAttribute): AttributeSpec {
  const spec = BY_ID.get(id);
  if (!spec) throw new Error(`Unknown attribute: ${id}`);
  return spec;
}

/**
 * How an operator reads in a sentence.
 *
 * The same operator says different things depending on what it compares:
 * `==` on an enum is "is", on a number it is "is exactly".
 */
const PHRASES: Record<ClaimOperator, { enum: string; number: string }> = {
  "==": { enum: "is", number: "is exactly" },
  "!=": { enum: "is not", number: "is not" },
  ">=": { enum: "is", number: "is at least" },
  ">": { enum: "is", number: "is higher than" },
  "<=": { enum: "is", number: "is at most" },
  "<": { enum: "is", number: "is lower than" },
};

export function operatorPhrase(operator: ClaimOperator, kind: AttributeSpec["kind"]): string {
  return PHRASES[operator][kind];
}

/** The label shown for a value, e.g. `Bachelor` → "a Bachelor's". */
export function valueLabel(spec: AttributeSpec, operand: string | number): string {
  if (spec.kind === "number") {
    const n = Number(operand);
    return spec.scale === 100 ? n.toFixed(2) : String(n);
  }
  return spec.options?.find((o) => String(o.value) === String(operand))?.label ?? String(operand);
}
