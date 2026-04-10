import { getVine } from "./vine";

export const createEventValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        name: vine.string().minLength(3).maxLength(255),
        description: vine.string().minLength(10).maxLength(5000),
        date: vine.date(),
        end_date: vine.date().optional(),
        location: vine.string().minLength(3).maxLength(255),
        event_paid: vine.boolean(),
        event_type: vine.enum([
          "CONFERENCE",
          "WORKSHOP",
          "MEETUP",
          "CONCERT",
          "FESTIVAL",
        ]),
        price: vine.number().min(0).optional(),
        capacity: vine.number().min(1),
      }),
    ).validate(data);
  }
};

export const updateEventValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        name: vine.string().minLength(3).maxLength(255).optional(),
        description: vine.string().minLength(10).maxLength(5000).optional(),
        date: vine.date().optional(),
        end_date: vine.date().optional(),
        location: vine.string().minLength(3).maxLength(255).optional(),
        event_type: vine
          .enum(["CONFERENCE", "WORKSHOP", "MEETUP", "CONCERT", "FESTIVAL"])
          .optional(),
        event_paid: vine.boolean().optional(),
        price: vine.number().min(0).optional(),
        capacity: vine.number().min(1).optional(),
        image_url: vine.string().url().optional(),
      }),
    ).validate(data);
  }
};

export const eventIdValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        id: vine.number().positive(),
      }),
    ).validate(data);
  }
};

export const listEventsValidator = {
  validate: async (data: any) => {
    const vine = await getVine();
    return vine.compile(
      vine.object({
        status: vine.enum(["all", "active", "passed"]).optional(),
        search: vine.string().optional(),
        e_paid: vine.boolean().optional(),
        e_type: vine
          .enum(["CONFERENCE", "WORKSHOP", "MEETUP", "CONCERT", "FESTIVAL"])
          .optional(),
      }),
    ).validate(data);
  }
};
