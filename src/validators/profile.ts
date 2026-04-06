const getVine = async () => {
  const { default: vine, SimpleMessagesProvider } = await import("@vinejs/vine");
  return { vine, SimpleMessagesProvider };
};

export const updateProfileValidator = {
  validate: async (data: any) => {
    const { vine, SimpleMessagesProvider } = await getVine();
    const validator = vine.compile(
      vine.object({
        last_name: vine.string().optional(),
      }),
    );
    vine.messagesProvider = new SimpleMessagesProvider({
      "last_name.maxLength": "Last name must be at most 255 characters long.",
    });
    return validator.validate(data);
  }
};
