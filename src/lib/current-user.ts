import { prisma } from "@/lib/prisma";

/** Resolves a signed-in User.id to their PatientProfile.id (needed for Appointment FKs). */
export async function getPatientProfileId(userId: string) {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/** Resolves a signed-in User.id to their DoctorProfile.id (needed for Appointment FKs). */
export async function getDoctorProfileId(userId: string) {
  const profile = await prisma.doctorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}
