// Hand-rolled .ics (RFC 5545) generation — deliberately not a dependency for
// this: the format is ~10 lines of plain text, and it means the calendar
// export works for every appointment regardless of whether the recipient
// ever connected Google Calendar (OAuth is opt-in; this isn't). Apple
// Calendar, Outlook, and Google Calendar's "import" all read this natively.

function toICSDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildAppointmentICS(params: {
  uid: string;
  slotStart: Date;
  slotEnd: Date;
  summary: string;
  description?: string;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareFlow//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${params.uid}@careflow`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(params.slotStart)}`,
    `DTEND:${toICSDate(params.slotEnd)}`,
    `SUMMARY:${escapeICS(params.summary)}`,
    ...(params.description ? [`DESCRIPTION:${escapeICS(params.description)}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
