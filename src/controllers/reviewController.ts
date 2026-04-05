import { Request, Response } from "express";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
import { createReviewValidator } from "../validators/review";

export const createReviewController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedData;

    try {
      validatedData = await createReviewValidator.validate(req.body);
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

    const { eventId, rating, comment } = validatedData;

    // 1. Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId, deleted: false },
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

    // 2. Check if event has passed
    if (new Date(event.date) > new Date()) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "You can only review an event after it has occurred.",
        }),
      );
    }

    // 3. Check if user was registered/attended (Order status DONE or Registration exists)
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (!registration) {
      return res.status(403).send(
        responseFormatter({
          code: 403,
          status: "error",
          message: "You must attend the event to leave a review.",
        }),
      );
    }

    // 4. Check if user already reviewed
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (existingReview) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "You have already reviewed this event.",
        }),
      );
    }

    // 5. Create review and update event rating in a transaction
    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          userId,
          eventId,
          rating,
          comment,
        },
      });

      const aggregate = await tx.review.aggregate({
        where: { eventId },
        _avg: { rating: true },
      });

      await tx.event.update({
        where: { id: eventId },
        data: { rating: aggregate._avg.rating || 0 },
      });

      return newReview;
    });

    return res.status(201).send(
      responseFormatter({
        code: 201,
        status: "success",
        message: "Review submitted successfully.",
        data: review,
      }),
    );
  } catch (error: any) {
    console.error("Create review error:", error);
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: error.message || "Internal server error.",
      }),
    );
  }
};

export const getEventReviewsController = async (
  req: Request,
  res: Response,
) => {
  try {
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

    const reviews = await prisma.review.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Reviews retrieved successfully.",
        data: reviews,
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

export const getOrganizerReviewsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const organizerId = Number(req.params.id);

    if (isNaN(organizerId)) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Invalid organizer ID.",
        }),
      );
    }

    // Get all events by this organizer and their reviews
    const reviews = await prisma.review.findMany({
      where: {
        event: {
          createdBy: organizerId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate overall organizer rating
    const aggregate = await prisma.review.aggregate({
      where: {
        event: {
          createdBy: organizerId,
        },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Organizer reviews retrieved successfully.",
        data: {
          reviews,
          averageRating: aggregate._avg.rating || 0,
          totalReviews: aggregate._count.rating,
        },
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
