import { api } from "./axios-instance";
import type { User } from "../models/user.model";

export const AuthAPI = {
  async me(): Promise<User> {
    const res = await api.get<User>("/auth/me");
    return res.data;
  },
};
