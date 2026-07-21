import { z } from "zod";

export const assignUserRoleSchema = z.object({
  body: z.object({
    roleId: z.string().cuid("Invalid Role Definition ID").min(1, "Role ID is required"),
    hospitalId: z.string().cuid("Invalid Hospital ID").optional().nullable(),
    branchId: z.string().cuid("Invalid Branch ID").optional().nullable(),
  }),
});
