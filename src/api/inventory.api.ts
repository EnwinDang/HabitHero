import { apiFetch } from "./client";

export function getInventory(uid: string) {
  return apiFetch(`/users/${uid}/inventory`);
}

export function equipItem(uid: string, data: any) {
  return apiFetch(`/users/${uid}/equipped`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
