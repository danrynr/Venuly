import { Request, Response } from "express";
import { prisma } from "../service/prisma";
import { responseFormatter } from "../middleware/responseFormatter";
import { createOrderValidator, orderIdValidator } from "../validators/order";
import { uploadStream } from "../service/cloudinary";
import { sendMail } from "../service/mail";
import { orderQueue } from "../service/queue";

export const createOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    let validatedData;

    const dataToValidate = {
        ...req.body,
        event_id: req.body?.event_id ? Number(req.body.event_id) : undefined,
        quantity: req.body?.quantity ? Number(req.body.quantity) : 1,
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

    const { event_id, coupon_code, voucher_code, quantity, use_points } = validatedData;
    const ticketQuantity = quantity || 1;

    // 1. Check event and capacity
    const event = await prisma.event.findUnique({
      where: { id: event_id, deleted: false },
    });

    if (!event) {
      return res.status(404).send(responseFormatter({ code: 404, status: "error", message: "Event not found." }));
    }

    const activeOrders = await prisma.order.aggregate({
        where: {
            eventId: event_id,
            status: { in: ["DONE", "WAITING_FOR_PAYMENT", "WAITING_FOR_ADMIN_CONFIRMATION"] },
            OR: [
                { status: { in: ["DONE", "WAITING_FOR_ADMIN_CONFIRMATION"] } },
                { status: "WAITING_FOR_PAYMENT", expiresAt: { gt: new Date() } }
            ]
        },
        _sum: { quantity: true }
    });

    const currentBooked = activeOrders._sum.quantity || 0;
    if (currentBooked + ticketQuantity > event.capacity) {
      return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Not enough seats available." }));
    }

    let discount = 0n;
    let couponId: number | null = null;
    let voucherId: number | null = null;
    let pointsUsed = 0n;

    const basePriceTotal = event.eventPrice * BigInt(ticketQuantity);

    // 2. Handle Referral Coupon
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
        return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Invalid or expired coupon." }));
      }
      couponId = userCoupon.id;
      discount += (basePriceTotal * BigInt(Math.round(userCoupon.discount))) / 100n;
    }

    // 3. Handle Event-Specific Voucher
    if (voucher_code) {
        const voucher = await prisma.voucher.findFirst({
            where: {
                code: voucher_code,
                eventId: event_id,
                isUsed: false,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
                OR: [{ userId: null }, { userId: userId }]
            }
        });

        if (!voucher) {
            return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Invalid or expired event voucher." }));
        }
        voucherId = voucher.id;
        discount += (basePriceTotal * BigInt(Math.round(voucher.discount))) / 100n;
    }

    // 4. Handle Points
    if (use_points) {
      const userPoints = await prisma.userPoint.findMany({
        where: {
          userId,
          points: { gt: 0n },
          OR: [{ expiredAt: null }, { expiredAt: { gt: new Date() } }],
        },
      });

      const totalPoints = userPoints.reduce((acc: bigint, curr) => acc + curr.points, 0n);
      const remainingPrice = basePriceTotal - discount;
      pointsUsed = totalPoints > remainingPrice ? (remainingPrice > 0n ? remainingPrice : 0n) : totalPoints;
    }

    const totalPrice = basePriceTotal - discount - pointsUsed;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const order = await prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          eventId: event.id,
          couponId,
          voucherId,
          quantity: ticketQuantity,
          basePrice: basePriceTotal,
          discount,
          pointsUsed,
          totalPrice: totalPrice < 0n ? 0n : totalPrice,
          status: "WAITING_FOR_PAYMENT",
          expiresAt,
        },
      });

      if (couponId) await tx.userCoupon.update({ where: { id: couponId }, data: { isUsed: true, usedAt: new Date() } });
      if (voucherId) await tx.voucher.update({ where: { id: voucherId }, data: { isUsed: true, usedAt: new Date() } });

      if (pointsUsed > 0n) {
        let remainingToDeduct = pointsUsed;
        const activePoints = await tx.userPoint.findMany({
          where: { userId, points: { gt: 0n } },
          orderBy: { createdAt: "asc" },
        });

        for (const pointRecord of activePoints) {
          if (remainingToDeduct <= 0n) break;
          const toDeduct = pointRecord.points > remainingToDeduct ? remainingToDeduct : pointRecord.points;
          await tx.userPoint.update({ where: { id: pointRecord.id }, data: { points: pointRecord.points - toDeduct } });
          remainingToDeduct -= toDeduct;
        }
      }
      return newOrder;
    });

    // Schedule expiration job (2 hours)
    await orderQueue.add(
      `payment-expiration-${order.id}`,
      { orderId: order.id, type: "PAYMENT_EXPIRATION" },
      { delay: 2 * 60 * 60 * 1000 },
    );

    return res.status(201).send(
      responseFormatter({
        code: 201,
        status: "success",
        message: "Order created. Please proceed to payment within 2 hours.",
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
    return res.status(500).send(responseFormatter({ code: 500, status: "error", message: error.message || "Internal server error." }));
  }
};

export const payOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = await orderIdValidator.validate(req.params);

    const order = await prisma.order.findUnique({ where: { id, userId } });

    if (!order) return res.status(404).send(responseFormatter({ code: 404, status: "error", message: "Order not found." }));
    if (order.status !== "WAITING_FOR_PAYMENT") return res.status(400).send(responseFormatter({ code: 400, status: "error", message: `Invalid status: ${order.status}` }));

    if (new Date() > order.expiresAt) {
      await prisma.$transaction(async (tx: any) => {
        await tx.order.update({ where: { id }, data: { status: "EXPIRED" } });
        if (order.couponId) await tx.userCoupon.update({ where: { id: order.couponId }, data: { isUsed: false, usedAt: null } });
        if (order.voucherId) await tx.voucher.update({ where: { id: order.voucherId }, data: { isUsed: false, usedAt: null } });
        if (order.pointsUsed > 0n) await tx.userPoint.create({ data: { userId: order.userId, points: order.pointsUsed } });
      });
      return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Order has expired." }));
    }

    if (!req.file) return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Payment proof required." }));

    const uploadResult = await uploadStream(req.file.buffer, "payments");

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status: "WAITING_FOR_ADMIN_CONFIRMATION", paymentProof: uploadResult.secure_url },
    });

    // Schedule admin confirmation timeout (3 days)
    await orderQueue.add(
      `admin-timeout-${updatedOrder.id}`,
      { orderId: updatedOrder.id, type: "ADMIN_CONFIRMATION_TIMEOUT" },
      { delay: 3 * 24 * 60 * 60 * 1000 },
    );

    return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Payment proof uploaded.", data: { ...updatedOrder, basePrice: updatedOrder.basePrice.toString(), discount: updatedOrder.discount.toString(), pointsUsed: updatedOrder.pointsUsed.toString(), totalPrice: updatedOrder.totalPrice.toString() } }));
  } catch (error: any) {
    return res.status(500).send(responseFormatter({ code: 500, status: "error", message: "Internal server error." }));
  }
};

export const cancelOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = await orderIdValidator.validate(req.params);
    const order = await prisma.order.findUnique({ where: { id, userId } });

    if (!order) return res.status(404).send(responseFormatter({ code: 404, status: "error", message: "Order not found." }));
    if (!["WAITING_FOR_PAYMENT", "WAITING_FOR_ADMIN_CONFIRMATION"].includes(order.status)) return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Cannot cancel." }));

    await prisma.$transaction(async (tx: any) => {
      await tx.order.update({ where: { id }, data: { status: "CANCELED" } });
      if (order.couponId) await tx.userCoupon.update({ where: { id: order.couponId }, data: { isUsed: false, usedAt: null } });
      if (order.voucherId) await tx.voucher.update({ where: { id: order.voucherId }, data: { isUsed: false, usedAt: null } });
      if (order.pointsUsed > 0n) await tx.userPoint.create({ data: { userId: order.userId, points: order.pointsUsed } });
      await tx.eventRegistration.deleteMany({ where: { userId, eventId: order.eventId } });
    });

    return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Order canceled." }));
  } catch (error: any) {
    return res.status(500).send(responseFormatter({ code: 500, status: "error", message: "Internal server error." }));
  }
};

export const adminConfirmOrderController = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const roles = req.user!.roles;
        const { id } = await orderIdValidator.validate(req.params);
        const order = await prisma.order.findUnique({ where: { id }, include: { user: true, event: true } });

        if (!order || order.status !== "WAITING_FOR_ADMIN_CONFIRMATION") {
            return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Order not pending confirmation." }));
        }

        // Permission check: Admin or Organizer of the event
        if (!roles.includes("ADMIN") && order.event.createdBy !== userId) {
            return res.status(403).send(responseFormatter({ code: 403, status: "error", message: "Forbidden: Not your event." }));
        }

        const finalizedOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({ where: { id }, data: { status: "DONE" } });
            await tx.eventRegistration.upsert({
                where: { userId_eventId: { userId: updated.userId, eventId: updated.eventId } },
                create: { userId: updated.userId, eventId: updated.eventId },
                update: {}
            });
            return updated;
        });

        await sendMail(order.user.email, "Ticket Order Confirmed!", `<p>Hi ${order.user.firstName}, your ticket for ${order.event.name} is ready!</p>`);

        return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Order confirmed.", data: { ...finalizedOrder, totalPrice: finalizedOrder.totalPrice.toString() } }));
    } catch (error: any) {
        return res.status(500).send(responseFormatter({ code: 500, status: "error", message: "Internal server error." }));
    }
}

export const adminRejectOrderController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const roles = req.user!.roles;
    const { id } = await orderIdValidator.validate(req.params);
    const order = await prisma.order.findUnique({ where: { id }, include: { user: true, event: true } });

    if (!order || order.status !== "WAITING_FOR_ADMIN_CONFIRMATION") {
      return res.status(400).send(responseFormatter({ code: 400, status: "error", message: "Order not pending confirmation." }));
    }

    if (!roles.includes("ADMIN") && order.event.createdBy !== userId) {
        return res.status(403).send(responseFormatter({ code: 403, status: "error", message: "Forbidden: Not your event." }));
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: "REJECTED" } });
      if (order.couponId) await tx.userCoupon.update({ where: { id: order.couponId }, data: { isUsed: false, usedAt: null } });
      if (order.voucherId) await tx.voucher.update({ where: { id: order.voucherId }, data: { isUsed: false, usedAt: null } });
      if (order.pointsUsed > 0n) await tx.userPoint.create({ data: { userId: order.userId, points: order.pointsUsed } });
    });

    await sendMail(order.user.email, "Order Payment Rejected", `<p>Your payment for ${order.event.name} was rejected. Rewards restored.</p>`);

    return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Order rejected." }));
  } catch (error: any) {
    return res.status(500).send(responseFormatter({ code: 500, status: "error", message: "Internal server error." }));
  }
};

export const listOrdersController = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isAdmin = user.roles.includes("ADMIN");
    const isOrganizer = user.roles.includes("ORGANIZER");
    const { status, event_id, user_id } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (user_id) where.userId = Number(user_id);
    if (isOrganizer && !isAdmin) where.event = { createdBy: user.userId };
    if (event_id) where.eventId = Number(event_id);

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        event: { select: { id: true, name: true, createdBy: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedOrders = orders.map((order) => ({
      ...order,
      basePrice: order.basePrice.toString(),
      discount: order.discount.toString(),
      pointsUsed: order.pointsUsed.toString(),
      totalPrice: order.totalPrice.toString(),
    }));

    return res.status(200).send(responseFormatter({ code: 200, status: "success", message: "Orders retrieved.", data: formattedOrders }));
  } catch (error: any) {
    return res.status(500).send(responseFormatter({ code: 500, status: "error", message: "Internal server error." }));
  }
};

export const createVoucherController = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { event_id, code, discount, start_date, end_date, target_user_id } = req.body;

        const event = await prisma.event.findUnique({ where: { id: Number(event_id) } });
        if (!event || event.createdBy !== userId) {
            return res.status(403).send(responseFormatter({ code: 403, status: "error", message: "Unauthorized." }));
        }

        const voucher = await prisma.voucher.create({
            data: {
                eventId: Number(event_id),
                code,
                discount: Number(discount),
                startDate: new Date(start_date),
                endDate: new Date(end_date),
                userId: target_user_id ? Number(target_user_id) : null,
            }
        });

        return res.status(201).send(responseFormatter({ code: 201, status: "success", message: "Voucher created.", data: voucher }));
    } catch (error: any) {
        return res.status(500).send(responseFormatter({ code: 500, status: "error", message: error.message }));
    }
};
