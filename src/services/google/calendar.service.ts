import { gapi } from "gapi-script";

export interface CalendarTask {
  title: string;
  startTime: number;
  endTime: number;
  description?: string;
}

function toIsoDateTime(timestamp: number): string {
  if (timestamp < 10_000_000_000) {
    timestamp *= 1000;
  }
  return new Date(timestamp).toISOString();
}

export async function addEventToCalendar(task: CalendarTask) {
  const event = {
    summary: task.title,
    description: task.description ?? "",
    start: { dateTime: toIsoDateTime(task.startTime) },
    end: { dateTime: toIsoDateTime(task.endTime) },
  };

  return gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });
}
