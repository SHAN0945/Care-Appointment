function wrap(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="font-family:sans-serif;color:#1f2937;max-width:480px;margin:0 auto;padding:24px;">
<h2 style="color:#1d4ed8;">${title}</h2>
${bodyHtml}
<p style="color:#6b7280;font-size:12px;margin-top:32px;">CareFlow</p>
</body></html>`;
}

function fmt(dateIso: string): string {
  return new Date(dateIso).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function bookingConfirmationEmail(params: {
  recipientName: string;
  otherPartyName: string;
  slotStart: string;
  isPatient: boolean;
}) {
  const { recipientName, otherPartyName, slotStart, isPatient } = params;
  return {
    subject: "Appointment confirmed",
    html: wrap(
      "Appointment confirmed",
      `<p>Hi ${recipientName},</p>
       <p>Your appointment ${isPatient ? `with Dr. ${otherPartyName}` : `with patient ${otherPartyName}`} is confirmed for:</p>
       <p style="font-size:18px;font-weight:600;">${fmt(slotStart)}</p>`
    ),
  };
}

export function cancellationEmail(params: {
  recipientName: string;
  otherPartyName: string;
  slotStart: string;
  isPatient: boolean;
  reason?: string;
}) {
  const { recipientName, otherPartyName, slotStart, isPatient, reason } = params;
  return {
    subject: "Appointment cancelled",
    html: wrap(
      "Appointment cancelled",
      `<p>Hi ${recipientName},</p>
       <p>Your appointment ${isPatient ? `with Dr. ${otherPartyName}` : `with patient ${otherPartyName}`} on <strong>${fmt(slotStart)}</strong> has been cancelled.</p>
       ${reason ? `<p>Reason: ${reason}</p>` : ""}`
    ),
  };
}

export function leaveConflictEmail(params: { recipientName: string; doctorName: string; slotStart: string }) {
  const { recipientName, doctorName, slotStart } = params;
  return {
    subject: "Your appointment needs to be rescheduled",
    html: wrap(
      "Appointment needs to be rescheduled",
      `<p>Hi ${recipientName},</p>
       <p>Dr. ${doctorName} is unavailable on <strong>${fmt(slotStart)}</strong>, so this appointment has been cancelled.</p>
       <p>We're sorry for the inconvenience — please log in to book a new slot.</p>`
    ),
  };
}

export function appointmentReminderEmail(params: { recipientName: string; otherPartyName: string; slotStart: string; isPatient: boolean }) {
  const { recipientName, otherPartyName, slotStart, isPatient } = params;
  return {
    subject: "Appointment reminder",
    html: wrap(
      "Upcoming appointment reminder",
      `<p>Hi ${recipientName},</p>
       <p>Reminder: your appointment ${isPatient ? `with Dr. ${otherPartyName}` : `with patient ${otherPartyName}`} is coming up:</p>
       <p style="font-size:18px;font-weight:600;">${fmt(slotStart)}</p>`
    ),
  };
}

export function medicationReminderEmail(params: {
  recipientName: string;
  medicationName: string;
  dosage?: string | null;
  frequency: string;
}) {
  const { recipientName, medicationName, dosage, frequency } = params;
  return {
    subject: `Medication reminder: ${medicationName}`,
    html: wrap(
      "Medication reminder",
      `<p>Hi ${recipientName},</p>
       <p>Time to take your medication:</p>
       <p style="font-size:18px;font-weight:600;">${medicationName}${dosage ? ` — ${dosage}` : ""}</p>
       <p>Frequency: ${frequency}</p>`
    ),
  };
}
