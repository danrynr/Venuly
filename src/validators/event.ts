import { z, makeValidator } from "./vine";

const eventTypeEnum = z.enum(["CONFERENCE", "WORKSHOP", "MEETUP", "CONCERT", "FESTIVAL"]);

export const createEventValidator = makeValidator(
  z.object({
    name: z.string().min(3).max(255),
    description: z.string().min(10).max(5000),
    date: z.coerce.date(),
    end_date: z.coerce.date().optional(),
    location: z.string().min(3).max(255),
    event_paid: z.boolean(),
    event_type: eventTypeEnum,
    price: z.number().min(0).optional(),
    capacity: z.number().min(1),
  })
);

export const updateEventValidator = makeValidator(
  z.object({
    name: z.string().min(3).max(255).optional(),
    description: z.string().min(10).max(5000).optional(),
    date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
    location: z.string().min(3).max(255).optional(),
    event_type: eventTypeEnum.optional(),
    event_paid: z.boolean().optional(),
    price: z.number().min(0).optional(),
    capacity: z.number().min(1).optional(),
    image_url: z.string().url().optional(),
  })
);

export const eventIdValidator = makeValidator(
  z.object({
    id: z.coerce.number().positive(),
  })
);

export const listEventsValidator = makeValidator(
  z.object({
    status: z.enum(["all", "active", "passed"]).optional(),
    search: z.string().optional(),
    e_paid: z.coerce.boolean().optional(),
    e_type: eventTypeEnum.optional(),
  })
);
