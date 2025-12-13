import { apiFetch } from "./client";

export function getMe() {
  return apiFetch("/auth/me");
}

export function getUser(uid: string) {
  return apiFetch(`/users/${uid}`);
}

export function updateUser(uid: string, data: any) {
  return apiFetch(`/users/${uid}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
