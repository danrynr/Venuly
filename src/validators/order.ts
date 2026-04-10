import { getVine } from "./vine";

export const createOrderValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        event_id: vine.number().positive(),
        coupon_code: vine.string().optional(),
        voucher_code: vine.string().optional(),
        quantity: vine.number().min(1).optional(),
        use_points: vine.boolean().optional(),
      }),
    ).validate(data);
  }
};

export const orderIdValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        id: vine.number().positive(),
      }),
    ).validate(data);
  }
};
