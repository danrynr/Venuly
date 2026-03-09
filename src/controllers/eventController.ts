import { Request, Response } from "express";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
import {
  createEventValidator,
  eventIdValidator,
  updateEventValidator,
} from "../validators/event";

export const createEventController = async (req: Request, res: Response) => {
  try {
    let validatedData;
    try {
      validatedData = await createEventValidator.validate(req.body);
    } catch (err: any) {
      const response = responseFormatter({
        code: 400,
        status: "error",
        message: err.messages,
      });
      return res.status(400).send(response);
    }
    const {
      name,
      description,
      date,
      location,
      image_url,
      event_type,
      event_paid,
      price,
    } = validatedData;

    const event = await prisma.event.create({
      data: {
        name,
        description,
        date,
        location,
        image: image_url,
        eventType: event_type,
        eventPaid: event_paid,
        eventPrice: BigInt(price || 0),
        createdBy: req.user!.userId,
      },
    });

    const response = responseFormatter({
      code: 201,
      status: "success",
      message: "Event created successfully.",
      data: { ...event, eventPrice: event.eventPrice.toString() },
    });
    return res.status(201).send(response);
  } catch (error: any) {
    const response = responseFormatter({
      code: 500,
      status: "error",
      message: error.messages || "Internal server error.",
      data: error,
    });
    return res.status(500).send(response);
  }
};

export const updateEventController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedId;
    let validatedData;
    try {
      validatedId = await eventIdValidator.validate(req.params);
      validatedData = await updateEventValidator.validate(req.body);
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
        name: validatedData.name,
        description: validatedData.description,
        date: validatedData.date,
        location: validatedData.location,
        image: validatedData.image_url,
        eventType: validatedData.event_type,
        eventPaid: validatedData.event_paid,
        eventPrice:
          validatedData.price !== undefined
            ? BigInt(validatedData.price)
            : undefined,
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
        message: error.messages || "Internal server error.",
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
