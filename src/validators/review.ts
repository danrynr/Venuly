import { getVine } from "./vine";

export const createReviewValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        event_id: vine.number(),
        rating: vine.number().min(1).max(5),
        comment: vine.string().trim().optional(),
      }),
    ).validate(data);
  }
};
