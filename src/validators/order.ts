const getVine = async () => {
  const { default: vine, SimpleMessagesProvider } = await import("@vinejs/vine");
  return { vine, SimpleMessagesProvider };
};

export const createOrderValidator = {
  validate: async (data: any) => {
    const { vine } = await getVine();
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
    const { vine, SimpleMessagesProvider } = await getVine();
    const validator = vine.compile(
      vine.object({
        id: vine.number().positive(),
      }),
    );
    vine.messagesProvider = new SimpleMessagesProvider({
      "event_id.required": "Event ID is required.",
      "id.positive": "Order ID must be a positive number.",
      "quantity.min": "Ticket quantity must be at least 1.",
    });
    return validator.validate(data);
  }
};
