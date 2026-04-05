import { Request, Response } from "express";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
import {
  createEventValidator,
  eventIdValidator,
  updateEventValidator,
  listEventsValidator,
} from "../validators/event";
import { uploadStream } from "../service/cloudinary";

export const eventListController = async (req: Request, res: Response) => {
  try {
    let validatedQuery;
    try {
      validatedQuery = await listEventsValidator.validate(req.query);
    } catch (err: any) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: err.messages || "Invalid query parameters.",
        }),
      );
    }

    const { status, search, e_paid, e_type } = validatedQuery;
    const now = new Date();

    const where: any = {
      deleted: false,
      archived: false,
    };

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    if (e_paid !== undefined) {
      where.eventPaid = e_paid;
    }

    if (e_type) {
      where.eventType = e_type;
    }

    if (status === "active") {
      where.date = {
        gt: now,
      };
    } else if (status === "passed") {
      where.date = {
        lt: now,
      };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: {
        date: "asc",
      },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Events retrieved successfully.",
        data: events,
      }),
    );
  } catch (error: any) {
    console.error("List events error:", error);
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: error.message || "Internal server error.",
      }),
    );
  }
};

export const createEventController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedData;

    // Manually parse fields because multipart/form-data sends everything as strings
    const dataToValidate = {
      ...req.body,
      event_paid:
        req.body.event_paid === "true" || req.body.event_paid === "1" || req.body.event_paid === true,
      price: req.body.price ? Number(req.body.price) : undefined,
      capacity: req.body.capacity ? Number(req.body.capacity) : undefined,
    };

    try {
      validatedData = await createEventValidator.validate(dataToValidate);
    } catch (err: any) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: err.messages || "Validation failed.",
          data: err.errors,
        }),
      );
    }

    if (!req.file) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "No file uploaded.",
        }),
      );
    }

    const { name, description, date, location, event_type, event_paid, price, capacity } =
      validatedData;

    const uploadResult = await uploadStream(req.file.buffer, "events");

    const event = await prisma.event.create({
      data: {
        name,
        description,
        date,
        location,
        image: uploadResult.secure_url,
        eventType: event_type,
        eventPaid: event_paid,
        eventPrice: BigInt(Math.round(price || 0)),
        capacity: capacity,
        createdBy: userId,
      },
    });

    return res.status(201).send(
      responseFormatter({
        code: 201,
        status: "success",
        message: "Event created successfully.",
        data: event,
      }),
    );
  } catch (error: any) {
    console.error("Create event error:", error);
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: error.message || "Internal server error.",
      }),
    );
  }
};

export const updateEventController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedId;
    let validatedData;

    try {
      validatedId = await eventIdValidator.validate(req.params);

      // Manually parse fields because multipart/form-data sends everything as strings
      const dataToValidate = {
        ...req.body,
        event_paid:
          req.body.event_paid !== undefined
            ? req.body.event_paid === "true" || req.body.event_paid === "1" || req.body.event_paid === true
            : undefined,
        price: req.body.price !== undefined ? Number(req.body.price) : undefined,
        capacity: req.body.capacity !== undefined ? Number(req.body.capacity) : undefined,
      };

      validatedData = await updateEventValidator.validate(dataToValidate);
    } catch (err: any) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: err.messages || "Validation failed.",
          data: err.errors,
        }),
      );
    }

    const {
      name,
      description,
      date,
      location,
      event_type,
      event_paid,
      price,
      capacity,
      image_url,
    } = validatedData;

    const event = await prisma.event.findUnique({
      where: { id: validatedId.id },
    });

    if (!event) {
      return res.status(404).send(
        responseFormatter({
          code: 404,
          status: "error",
          message: "Event not found.",
        }),
      );
    }

    if (event.createdBy !== userId) {
      return res.status(403).send(
        responseFormatter({
          code: 403,
          status: "error",
          message: "Forbidden",
        }),
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id: validatedId.id },
      data: {
        name: name,
        description: description,
        date: date,
        location: location,
        image: image_url,
        eventType: event_type,
        eventPaid: event_paid,
        eventPrice: price !== undefined ? BigInt(Math.round(price)) : undefined,
        capacity: capacity,
      },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Event updated successfully.",
        data: {
          ...updatedEvent,
          eventPrice: updatedEvent.eventPrice.toString(),
        },
      }),
    );
  } catch (error: any) {
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: error.message || "Internal server error.",
        data: error,
      }),
    );
  }
};

export const registerEventController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedId;
    try {
      validatedId = await eventIdValidator.validate(req.params);
    } catch (err: any) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: err.messages,
      });
      return res.status(400).send(response);
    }

    const event = await prisma.event.findUnique({
      where: { id: validatedId.id },
    });
    if (!event) {
      return res.status(404).send(
        responseFormatter({
          code: 404,
          status: "error",
          message: "Event not found.",
        }),
      );
    }

    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: { userId, eventId: validatedId.id },
      },
    });

    if (existingRegistration) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "You are already registered for this event.",
        }),
      );
    }

    const registration = await prisma.eventRegistration.create({
      data: { userId, eventId: validatedId.id },
    });

    if (!registration) {
      return res.status(500).send(
        responseFormatter({
          code: 500,
          status: "error",
          message: "Failed to register for the event.",
        }),
      );
    }

    return res.status(201).send(
      responseFormatter({
        code: 201,
        status: "success",
        message: "Registered for event successfully.",
      }),
    );
  } catch (error: any) {
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: "Internal server error.",
        data: error,
      }),
    );
  }
};

export const leaveEventController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedId;
    try {
      validatedId = await eventIdValidator.validate(req.params);
    } catch (err: any) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: err.messages,
      });
      return res.status(400).send(response);
    }

    const registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: { userId, eventId: validatedId.id },
      },
    });

    if (!registration) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "You are not registered for this event.",
        }),
      );
    }

    const eventStatus = await prisma.event.findUnique({
      where: { id: validatedId.id },
      select: { date: true },
    });

    if (eventStatus && eventStatus.date < new Date()) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Cannot leave an event that has already occurred.",
        }),
      );
    }

    await prisma.eventRegistration.delete({
      where: {
        userId_eventId: { userId, eventId: validatedId.id },
      },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Successfully left the event.",
      }),
    );
  } catch (error: any) {
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: "Internal server error.",
        data: error,
      }),
    );
  }
};

export const joinedEventsController = async (req: Request, res: Response) => {};

export const getAttendeeListController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const eventId = Number(req.params.id);

    if (isNaN(eventId)) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Invalid event ID.",
        }),
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { createdBy: true },
    });

    if (!event) {
      return res.status(404).send(
        responseFormatter({
          code: 404,
          status: "error",
          message: "Event not found.",
        }),
      );
    }

    if (event.createdBy !== userId) {
      return res.status(403).send(
        responseFormatter({
          code: 403,
          status: "error",
          message: "Forbidden: You are not the organizer of this event.",
        }),
      );
    }

    const attendees = await prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Attendee list retrieved successfully.",
        data: attendees.map((reg) => reg.user),
      }),
    );
  } catch (error: any) {
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: error.message || "Internal server error.",
      }),
    );
  }
};
