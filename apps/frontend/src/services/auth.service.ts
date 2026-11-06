import type { AuthUser, Department, LoginInput, RegisterInput } from "@elms/shared";
import { request } from "./api.service";

export const authService = {
  departments: () => request.get<Department[]>("/auth/departments"),
  login: (body: LoginInput) => request.post<AuthUser>("/auth/login", body),
  register: (body: RegisterInput) => request.post<AuthUser>("/auth/register", body),
  me: () => request.get<AuthUser>("/auth/me"),
  logout: () => request.post<null>("/auth/logout"),
};
