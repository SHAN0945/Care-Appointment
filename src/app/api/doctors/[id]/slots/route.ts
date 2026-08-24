import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireRole("PATIENT");
  if (response) return response;
  const { id: doctorId } = await params;

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date"); // "YYYY-MM-DD"
  if (!dateParam || Number.isNaN(Date.parse(dateParam))) {
    return NextResponse.json({ error: "Invalid or missing ?date=YYYY-MM-DD" }, { status: 400 });
  }

  const slots = await getAvailableSlots(doctorId, new Date(dateParam));
  return NextResponse.json({
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}
