// ─────────────────────────────────────────────────────────────────────────
//  THIS ROUTE IS NOT PART OF EDUPROOF.
//
//  It plays the role of an EXTERNAL system: a university's own GraphQL
//  endpoint, which in production is operated by the institution, on the
//  institution's infrastructure, under the institution's control.
//
//  It is hosted here only so the public demo runs as a single deployment.
//  The Docker Compose setup runs it as a separate service, which is the
//  honest picture — see PLAN-MUST-READ-FIRST/11-school-vendor-contract.md.
//
//  HARD RULE: nothing under app/api/school/ may import from lib/proof/.
//  A school knows nothing about EduProof's proof system. Blurring the
//  deployment boundary is a tolerable trade; blurring the dependency
//  boundary would make the separation a fiction.
// ─────────────────────────────────────────────────────────────────────────

import { loadSchoolData } from "@/lib/school/data";
import { executeSchoolQuery, type GraphQLRequest } from "@/lib/school/schema";

const data = loadSchoolData();

export async function POST(request: Request) {
  let body: GraphQLRequest;

  try {
    body = (await request.json()) as GraphQLRequest;
  } catch {
    return Response.json({ errors: [{ message: "Malformed JSON body" }] }, { status: 400 });
  }

  if (typeof body?.query !== "string") {
    return Response.json({ errors: [{ message: "Missing `query`" }] }, { status: 400 });
  }

  const result = await executeSchoolQuery(body, data);
  return Response.json(result);
}

export function GET() {
  return Response.json(
    { errors: [{ message: "POST a GraphQL query to this endpoint" }] },
    { status: 405 }
  );
}
