import { NextResponse } from "next/server";
import { loadDeployments } from "../../../lib/data";

export async function GET() {
  const payload = loadDeployments();
  return NextResponse.json(payload, { status: 200 });
}
