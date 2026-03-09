import vine, { SimpleMessagesProvider } from "@vinejs/vine";

export const createOrderValidator = vine.compile(
  vine.object({
    event_id: vine.number().positive(),
    coupon_code: vine.string().optional(),
    use_points: vine.boolean().optional(),
  }),
);

export const orderIdValidator = vine.compile(
  vine.object({
    id: vine.number().positive(),
  }),
);

vine.messagesProvider = new SimpleMessagesProvider({
  "event_id.required": "Event ID is required.",
  "id.positive": "Order ID must be a positive number.",
});
