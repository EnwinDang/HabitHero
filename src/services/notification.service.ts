import { NotificationsAPI } from "../api/notifications.api";
import type { Notification } from "../models/notification.model";

export async function loadNotifications(): Promise<Notification[]> {
  return NotificationsAPI.listAll();
}

export async function markNotificationRead(
  notificationId: string
): Promise<Notification> {
  return NotificationsAPI.patch(notificationId, { isRead: true });
}
