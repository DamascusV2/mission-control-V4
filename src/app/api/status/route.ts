import { NextResponse } from "next/server";
import { loadStatus } from "../../../lib/data";

export async function GET() {
  const status = loadStatus();
  return NextResponse.json(status, { status: 200 });
}
