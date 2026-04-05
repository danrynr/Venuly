import vine, { SimpleMessagesProvider } from "@vinejs/vine";

export const updateProfileValidator = vine.compile(
  vine.object({
    last_name: vine.string().optional(),
  }),
);

vine.messagesProvider = new SimpleMessagesProvider({
  "last_name.maxLength": "Last name must be at most 255 characters long.",
});
