import { NextResponse } from "next/server";
import { loadLeadTracker } from "../../../lib/data";

export async function GET() {
  const payload = loadLeadTracker();
  return NextResponse.json(payload, { status: 200 });
}
