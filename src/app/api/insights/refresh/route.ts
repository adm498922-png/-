import { NextResponse } from "next/server";
import { collectInsightsForPublishedTargets } from "@/lib/insights";

export async function POST() {
  const result = await collectInsightsForPublishedTargets();
  return NextResponse.json(result);
}
