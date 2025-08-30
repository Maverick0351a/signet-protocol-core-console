import { NextRequest, NextResponse } from "next/server";

const SYSTEM = `You are the Signet Protocol concierge. Answer concisely.
Focus on: Verified Exchanges (VEx), Signed Receipts (SR-1), HEL egress control, Compliance Kit (EU AI Act, NIST AI RMF, ISO 42001).
If a question requires private keys or secrets, refuse and direct user to docs.`;

export async function POST(req: NextRequest) {
  const { q } = await req.json();
  // Placeholder: echo until provider configured
  const answer = `Signet enables cryptographic auditability and policy control. Ask: "${q}" -> See docs for pipeline: sanitize → canonicalize → receipt → export.`;
  return NextResponse.json({ answer });
}
