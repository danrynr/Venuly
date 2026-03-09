import { Request, Response } from "express";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
import { createOrderValidator, orderIdValidator } from "../validators/order";

export const createOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedData;

    // Manually parse strings from multipart/form-data or body if needed
    const dataToValidate = {
        ...req.body,
        event_id: req.body?.event_id ? Number(req.body.event_id) : undefined,
        use_points: req.body?.use_points === "true" || req.body?.use_points === true,
    };

    try {
      validatedData = await createOrderValidator.validate(dataToValidate);
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

    const { event_id, coupon_code, use_points } = validatedData;

    // 1. Check event and capacity
    // Available seats = capacity - (DONE + WAITING_FOR_PAYMENT + WAITING_FOR_ADMIN_CONFIRMATION)
    const event = await prisma.event.findUnique({
      where: { id: event_id, deleted: false },
      include: {
        _count: {
          select: {
            orders: {
              where: {
                status: {
                  in: ["DONE", "WAITING_FOR_PAYMENT", "WAITING_FOR_ADMIN_CONFIRMATION"],
                },
                // For WAITING_FOR_PAYMENT, only count if not expired
                OR: [
                  { status: { in: ["DONE", "WAITING_FOR_ADMIN_CONFIRMATION"] } },
                  { status: "WAITING_FOR_PAYMENT", expiresAt: { gt: new Date() } }
                ]
              },
            },
          },
        },
      },
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

    if (event._count.orders >= event.capacity) {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Event is fully booked.",
        }),
      );
    }

    let discount = 0n;
    let couponId: number | null = null;
    let pointsUsed = 0n;

    // 2. Handle Coupon
    if (coupon_code) {
      const userCoupon = await prisma.userCoupon.findFirst({
        where: {
          userId,
          couponCode: coupon_code,
          isUsed: false,
          OR: [{ expiredAt: null }, { expiredAt: { gt: new Date() } }],
        },
      });

      if (!userCoupon) {
        return res.status(400).send(
          responseFormatter({
            code: 400,
            status: "error",
            message: "Invalid or expired coupon.",
          }),
        );
      }
      couponId = userCoupon.id;
      discount = (event.eventPrice * BigInt(Math.round(userCoupon.discount))) / 100n;
    }

    // 3. Handle Points
    if (use_points) {
      const userPoints = await prisma.userPoint.findMany({
        where: {
          userId,
          points: { gt: 0n },
          OR: [{ expiredAt: null }, { expiredAt: { gt: new Date() } }],
        },
      });

      const totalPoints = userPoints.reduce((acc, curr) => acc + curr.points, 0n);
      const remainingPrice = event.eventPrice - discount;
      pointsUsed = totalPoints > remainingPrice ? remainingPrice : totalPoints;
    }

    const totalPrice = event.eventPrice - discount - pointsUsed;
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes hold

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          eventId: event.id,
          couponId,
          basePrice: event.eventPrice,
          discount,
          pointsUsed,
          totalPrice: totalPrice < 0n ? 0n : totalPrice,
          status: "WAITING_FOR_PAYMENT",
          expiresAt,
        },
      });

      if (couponId) {
        await tx.userCoupon.update({
          where: { id: couponId },
          data: { isUsed: true, usedAt: new Date() },
        });
      }

      if (pointsUsed > 0n) {
        let remainingToDeduct = pointsUsed;
        const activePoints = await tx.userPoint.findMany({
          where: { userId, points: { gt: 0n } },
          orderBy: { createdAt: "asc" },
        });

        for (const pointRecord of activePoints) {
          if (remainingToDeduct <= 0n) break;
          const toDeduct = pointRecord.points > remainingToDeduct ? remainingToDeduct : pointRecord.points;
          await tx.userPoint.update({
            where: { id: pointRecord.id },
            data: { points: pointRecord.points - toDeduct },
          });
          remainingToDeduct -= toDeduct;
        }
      }

      return newOrder;
    });

    return res.status(201).send(
      responseFormatter({
        code: 201,
        status: "success",
        message: "Order created. Please proceed to payment within 2 minutes.",
        data: {
            ...order,
            basePrice: order.basePrice.toString(),
            discount: order.discount.toString(),
            pointsUsed: order.pointsUsed.toString(),
            totalPrice: order.totalPrice.toString(),
        },
      }),
    );
  } catch (error: any) {
    console.error("Create order error:", error);
    return res.status(500).send(
      responseFormatter({
        code: 500,
        status: "error",
        message: error.message || "Internal server error.",
      }),
    );
  }
};

export const payOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = await orderIdValidator.validate(req.params);

    const order = await prisma.order.findUnique({
      where: { id, userId },
    });

    if (!order) {
      return res.status(404).send(
        responseFormatter({
          code: 404,
          status: "error",
          message: "Order not found.",
        }),
      );
    }

    if (order.status !== "WAITING_FOR_PAYMENT") {
      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: `Order status is ${order.status}. Cannot proceed to payment.`,
        }),
      );
    }

    if (new Date() > order.expiresAt) {
      // EXPIRED logic: Restore points and coupons
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status: "EXPIRED" },
        });

        if (order.couponId) {
          await tx.userCoupon.update({
            where: { id: order.couponId },
            data: { isUsed: false, usedAt: null },
          });
        }

        if (order.pointsUsed > 0n) {
          // Add back points (creating a new point record for simplicity or finding the last one)
          await tx.userPoint.create({
            data: {
              userId: order.userId,
              points: order.pointsUsed,
              // No expiry specified for restored points, or we could set a default
            },
          });
        }
      });

      return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: "Order has expired. Points and coupons have been restored.",
        }),
      );
    }

    // Move to confirmation stage
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: "WAITING_FOR_ADMIN_CONFIRMATION" },
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Payment received. Waiting for admin confirmation.",
        data: {
            ...updatedOrder,
            totalPrice: updatedOrder.totalPrice.toString()
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

export const cancelOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = await orderIdValidator.validate(req.params);

    const order = await prisma.order.findUnique({
      where: { id, userId },
    });

    if (!order) {
      return res.status(404).send(
        responseFormatter({
          code: 404,
          status: "error",
          message: "Order not found.",
        }),
      );
    }

    // Only allow cancellation for WAITING_FOR_PAYMENT or WAITING_FOR_ADMIN_CONFIRMATION
    if (!["WAITING_FOR_PAYMENT", "WAITING_FOR_ADMIN_CONFIRMATION"].includes(order.status)) {
       return res.status(400).send(
        responseFormatter({
          code: 400,
          status: "error",
          message: `Cannot cancel order with status ${order.status}.`,
        }),
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update status
      await tx.order.update({
        where: { id },
        data: { status: "CANCELED" },
      });

      // 2. Restore Coupon
      if (order.couponId) {
        await tx.userCoupon.update({
          where: { id: order.couponId },
          data: { isUsed: false, usedAt: null },
        });
      }

      // 3. Restore Points
      if (order.pointsUsed > 0n) {
        await tx.userPoint.create({
          data: {
            userId: order.userId,
            points: order.pointsUsed,
          },
        });
      }
      
      // 4. Registration cleanup (if it existed - though only DONE orders should have registration)
      await tx.eventRegistration.deleteMany({
        where: { userId, eventId: order.eventId },
      });
    });

    return res.status(200).send(
      responseFormatter({
        code: 200,
        status: "success",
        message: "Order canceled. Points, coupons, and seats have been restored.",
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

export const adminConfirmOrderController = async (req: Request, res: Response) => {
    try {
        const { id } = await orderIdValidator.validate(req.params);

        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order || order.status !== "WAITING_FOR_ADMIN_CONFIRMATION") {
            return res.status(400).send(
                responseFormatter({
                    code: 400,
                    status: "error",
                    message: "Order not found or not waiting for confirmation.",
                }),
            );
        }

        const finalizedOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({
                where: { id },
                data: { status: "DONE" },
            });

            await tx.eventRegistration.create({
                data: {
                    userId: updated.userId,
                    eventId: updated.eventId,
                },
            });

            return updated;
        });

        return res.status(200).send(
            responseFormatter({
                code: 200,
                status: "success",
                message: "Order confirmed successfully.",
                data: {
                    ...finalizedOrder,
                    totalPrice: finalizedOrder.totalPrice.toString()
                }
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
}
