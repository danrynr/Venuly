import vine, { SimpleMessagesProvider } from "@vinejs/vine";

export const createEventValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(255),
    description: vine.string().minLength(10).maxLength(5000),
    date: vine.date(),
    location: vine.string().minLength(3).maxLength(255),
    image_url: vine.string().url().optional(),
    event_paid: vine.enum([true, false]),
    event_type: vine.enum([
      "CONFERENCE",
      "WORKSHOP",
      "MEETUP",
      "CONCERT",
      "FESTIVAL",
    ]),
    price: vine.number().min(0).optional(),
  }),
);

export const updateEventValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(255).optional(),
    description: vine.string().minLength(10).maxLength(5000).optional(),
    date: vine.date().optional(),
    location: vine.string().minLength(3).maxLength(255).optional(),
    image_url: vine.string().url().optional(),
    event_type: vine
      .enum(["CONFERENCE", "WORKSHOP", "MEETUP", "CONCERT", "FESTIVAL"])
      .optional(),
    event_paid: vine.enum([true, false]).optional(),
    price: vine.number().min(0).optional(),
  }),
);

export const eventIdValidator = vine.compile(
  vine.object({
    id: vine.number().positive(),
  }),
);

vine.messagesProvider = new SimpleMessagesProvider({
  "name.minLength": "Event name must be at least 3 characters long.",
  "name.maxLength": "Event name must be at most 255 characters long.",
  "description.minLength": "Description must be at least 10 characters long.",
  "description.maxLength": "Description must be at most 5000 characters long.",
  "date.date": "Please provide a valid date for the event.",
  "location.minLength": "Location must be at least 3 characters long.",
  "location.maxLength": "Location must be at most 255 characters long.",
  "image_url.url": "Please provide a valid URL for the event image.",
  "event_type.enum": "Event type must be either 'free' or 'paid'.",
  "price.number": "Price must be a valid number.",
  "price.min": "Price cannot be negative.",
  "id.positive": "Event ID must be a positive number.",
  "id.number": "Event ID must be a valid number.",
});
