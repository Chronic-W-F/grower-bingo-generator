// app/api/fb-test/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = getDb();

    const ref = db.collection("_health").doc("ping");
    await ref.set({ ok: true, at: Date.now() }, { merge: true });

    const snap = await ref.get();
    return NextResponse.json({ ok: true, data: snap.data() ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "fb-test failed" },
      { status: 500 }
    );
  }
}
