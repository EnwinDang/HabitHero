import { gapi } from "gapi-script";

// Type-veilig Task type (minimaal wat we nodig hebben)
export interface CalendarTask {
  title: string;
  startTime: number; // Unix timestamp (ms of s)
  endTime: number;   // Unix timestamp
  description?: string;
}

/**
 * Converteert een unix timestamp (ms of s) naar ISO string voor Google Calendar.
 */
function toIsoDateTime(timestamp: number): string {
  // Indien seconden, omzetten naar ms
  if (timestamp < 10_000_000_000) {
    timestamp *= 1000;
  }
  return new Date(timestamp).toISOString();
}

/**
 * Voegt een event toe aan de primaire Google Calendar van de gebruiker.
 * Vereist dat de gebruiker al is ingelogd via Google OAuth.
 */
export async function addEventToCalendar(task: CalendarTask) {
  const event = {
    summary: task.title,
    description: task.description ?? "",
    start: {
      dateTime: toIsoDateTime(task.startTime)
    },
    end: {
      dateTime: toIsoDateTime(task.endTime)
    }
  };

  const response = await gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: event
  });

  return response;
}
