import { apiFetch } from "./client";
import type { User } from "../models/user.model";

export const AuthAPI = {
  me(): Promise<User> {
    return apiFetch<User>("/auth/me");
  },
};
