import { z, makeValidator } from "./vine";

export const createReviewValidator = makeValidator(
  z.object({
    event_id: z.number(),
    rating: z.number().min(1).max(5),
    comment: z.string().trim().optional(),
  })
);
