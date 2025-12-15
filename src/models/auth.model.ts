import { User } from "./user.model";

export interface AuthMeResponse {
  user: User;
  permissions?: string[];
}
