import { z, makeValidator } from "./vine";

export const createOrderValidator = makeValidator(
  z.object({
    event_id: z.number().positive(),
    coupon_code: z.string().optional(),
    voucher_code: z.string().optional(),
    quantity: z.number().min(1).optional(),
    use_points: z.boolean().optional(),
  })
);

export const orderIdValidator = makeValidator(
  z.object({
    id: z.coerce.number().positive(),
  })
);
