import cron from "node-cron";
import { prisma } from "../service/prisma";

export const startCronJobs = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find all orders that are WAITING_FOR_PAYMENT and have expired
      const expiredOrders = await prisma.order.findMany({
        where: {
          status: "WAITING_FOR_PAYMENT",
          expiresAt: { lt: now },
        },
      });

      if (expiredOrders.length === 0) return;

      console.log(`[Cron] Found ${expiredOrders.length} expired orders. Processing...`);

      for (const order of expiredOrders) {
        await prisma.$transaction(async (tx) => {
          // 1. Update status to EXPIRED
          await tx.order.update({
            where: { id: order.id },
            data: { status: "EXPIRED" },
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
        });
        console.log(`[Cron] Order ${order.id} expired and rewards restored.`);
      }
    } catch (error) {
      console.error("[Cron] Error processing expired orders:", error);
    }
  });

  console.log("[Cron] Background jobs started.");
};
