import { NextResponse } from "next/server";
import { loadVector } from "../../../lib/data";

export async function GET() {
  const payload = loadVector();
  return NextResponse.json(payload, { status: 200 });
}
