import { NextResponse } from "next/server";
import { buildAlertPayloads } from "../../../lib/alerts";

export async function GET() {
  return NextResponse.json(buildAlertPayloads(), { status: 200 });
}
