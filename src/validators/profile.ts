import { z, makeValidator } from "./vine";

export const updateProfileValidator = makeValidator(
  z.object({
    last_name: z.string().optional(),
  })
);
