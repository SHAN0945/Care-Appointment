import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; leaveId: string }> }
) {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  const { id: doctorId, leaveId } = await params;

  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave || leave.doctorId !== doctorId) {
    return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
  }

  await prisma.leave.delete({ where: { id: leaveId } });
  // Note: this only un-marks the leave day. Any appointments already
  // cancelled by cancelAppointmentsForLeave() are NOT auto-restored — the
  // slot may since have been rebooked, and silently re-confirming a stale
  // appointment risks a double-booking. Patients would need to rebook.
  return NextResponse.json({ ok: true });
}
