import type { AssignmentInput, ManagementAccountInput, ManagementOverview, ManagementUser } from "@elms/shared";
import { request } from "./api.service";

export const managementService = {
  overview: () => request.get<ManagementOverview>("/management"),
  createAccount: (body: ManagementAccountInput) => request.post<ManagementUser>("/management/accounts", body),
  assign: (body: AssignmentInput) => request.patch<ManagementUser>("/management/assignments", body),
};
