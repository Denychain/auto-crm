import { NextRequest, NextResponse } from "next/server";
import { getCurrentRate } from "@/lib/exchange-rate";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.CRON_SECRET && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rate = await getCurrentRate();
    return NextResponse.json({ ok: true, rate: rate.toNumber() });
  } catch {
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 });
  }
}
