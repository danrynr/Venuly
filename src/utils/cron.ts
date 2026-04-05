import cron from "node-cron";
import { prisma } from "../service/prisma";

export const startCronJobs = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // 1. Process orders that are WAITING_FOR_PAYMENT and have expired (2 hours window)
      const expiredPaymentOrders = await prisma.order.findMany({
        where: {
          status: "WAITING_FOR_PAYMENT",
          expiresAt: { lt: now },
        },
      });

      for (const order of expiredPaymentOrders) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "EXPIRED" },
          });

          if (order.couponId) {
            await tx.userCoupon.update({
              where: { id: order.couponId },
              data: { isUsed: false, usedAt: null },
            });
          }

          if (order.pointsUsed > 0n) {
            await tx.userPoint.create({
              data: {
                userId: order.userId,
                points: order.pointsUsed,
              },
            });
          }
        });
        console.log(`[Cron] Order ${order.id} expired (payment timeout).`);
      }

      // 2. Process orders WAITING_FOR_ADMIN_CONFIRMATION that have been pending for > 3 days
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const abandonedOrders = await prisma.order.findMany({
        where: {
          status: "WAITING_FOR_ADMIN_CONFIRMATION",
          updatedAt: { lt: threeDaysAgo },
        },
      });

      for (const order of abandonedOrders) {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "CANCELED" },
          });

          if (order.couponId) {
            await tx.userCoupon.update({
              where: { id: order.couponId },
              data: { isUsed: false, usedAt: null },
            });
          }

          if (order.pointsUsed > 0n) {
            await tx.userPoint.create({
              data: {
                userId: order.userId,
                points: order.pointsUsed,
              },
            });
          }
        });
        console.log(`[Cron] Order ${order.id} canceled (no admin action for 3 days).`);
      }

    } catch (error) {
      console.error("[Cron] Error processing cron jobs:", error);
    }
  });

  console.log("[Cron] Background jobs started.");
};
