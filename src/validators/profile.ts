import { getVine } from "./vine";

export const updateProfileValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        last_name: vine.string().optional(),
      }),
    ).validate(data);
  }
};
