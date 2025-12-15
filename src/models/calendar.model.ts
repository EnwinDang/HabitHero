export type CalendarEventType =
  | "task"
  | "exam"
  | "course"
  | "personal"
  | "system";

export interface CalendarEvent {
  eventId: string;
  uid: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  startAt: number;
  endAt?: number;
  relatedId?: string; // bv taskId / courseId
  createdAt: number;
}
