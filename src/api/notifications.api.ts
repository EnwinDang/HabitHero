import { apiFetch } from "./client";
import type { Notification } from "../models/notification.model";

export type PatchNotification = Partial<
  Pick<Notification, "isRead" | "title" | "body" | "data">
>;

export const NotificationsAPI = {
  // System/admin
  listAll(): Promise<Notification[]> {
    return apiFetch<Notification[]>("/notifications");
  },
  create(n: Notification): Promise<Notification> {
    return apiFetch<Notification>("/notifications", {
      method: "POST",
      body: JSON.stringify(n),
    });
  },

  // Single
  get(notificationId: string): Promise<Notification> {
    return apiFetch<Notification>(`/notifications/${notificationId}`);
  },
  patch(
    notificationId: string,
    patch: PatchNotification
  ): Promise<Notification> {
    return apiFetch<Notification>(`/notifications/${notificationId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  delete(notificationId: string): Promise<void> {
    return apiFetch<void>(`/notifications/${notificationId}`, {
      method: "DELETE",
    });
  },
};
