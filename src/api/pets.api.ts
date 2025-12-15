import { apiFetch } from "./client";
import type { Pet } from "../models/pet.model";

export const PetsAPI = {
  list(): Promise<Pet[]> {
    return apiFetch<Pet[]>("/pets");
  },
  create(pet: Pet): Promise<Pet> {
    return apiFetch<Pet>("/pets", { method: "POST", body: JSON.stringify(pet) });
  },
  get(petId: string): Promise<Pet> {
    return apiFetch<Pet>(`/pets/${petId}`);
  },
  replace(petId: string, pet: Pet): Promise<Pet> {
    return apiFetch<Pet>(`/pets/${petId}`, { method: "PUT", body: JSON.stringify(pet) });
  },
  patch(petId: string, patch: Partial<Pet>): Promise<Pet> {
    return apiFetch<Pet>(`/pets/${petId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  delete(petId: string): Promise<void> {
    return apiFetch<void>(`/pets/${petId}`, { method: "DELETE" });
  },
};
