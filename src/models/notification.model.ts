export type NotificationType =
  | "system"
  | "achievement"
  | "reward"
  | "combat"
  | "course"
  | "admin";

export interface Notification {
  notificationId: string;
  uid: string; // ontvanger
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: number;
  data?: Record<string, any>; // extra payload (bv taskId, combatId, etc.)
}
