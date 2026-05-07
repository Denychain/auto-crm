import { NextRequest, NextResponse } from "next/server";
import { getCurrentRate, setManualRate } from "@/lib/exchange-rate";

export async function GET() {
  try {
    const rate = await getCurrentRate();
    return NextResponse.json({ rate: rate.toNumber() });
  } catch {
    return NextResponse.json({ error: "Failed to fetch rate" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { rate: number; date?: string };
    if (!body.rate || typeof body.rate !== "number" || body.rate <= 0) {
      return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
    }
    const date = body.date ? new Date(body.date) : new Date();
    await setManualRate(body.rate, date);
    return NextResponse.json({ ok: true, rate: body.rate });
  } catch {
    return NextResponse.json({ error: "Failed to set rate" }, { status: 500 });
  }
}
