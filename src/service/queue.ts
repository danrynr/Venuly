import { Queue, Worker, Job } from "bullmq";
import { redisConnection } from "./redis";
import { prisma } from "./prisma";

// Define Job Data Types
interface OrderJobData {
  orderId: number;
  type: "PAYMENT_EXPIRATION" | "ADMIN_CONFIRMATION_TIMEOUT";
}

// 1. Create the Queue
export const orderQueue = new Queue<OrderJobData>("orderQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// 2. Define the Worker
export const orderWorker = new Worker<OrderJobData>(
  "orderQueue",
  async (job: Job<OrderJobData>) => {
    const { orderId, type } = job.data;
    console.log(`[Worker] Processing job ${job.id} for order ${orderId} (${type})`);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      console.warn(`[Worker] Order ${orderId} not found. Skipping.`);
      return;
    }

    if (type === "PAYMENT_EXPIRATION") {
      // If the order is still waiting for payment, mark it as expired
      if (order.status === "WAITING_FOR_PAYMENT") {
        await prisma.$transaction(async (tx: any) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "EXPIRED" },
          });

          if (order.couponId) {
            await tx.userCoupon.update({
              where: { id: order.couponId },
              data: { isUsed: false, usedAt: null },
            });
          }

          if (order.voucherId) {
            await tx.voucher.update({
              where: { id: order.voucherId },
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
        console.log(`[Worker] Order ${orderId} status set to EXPIRED.`);
      } else {
        console.log(`[Worker] Order ${orderId} status is ${order.status}, skipping expiration.`);
      }
    } else if (type === "ADMIN_CONFIRMATION_TIMEOUT") {
      // If the order is still waiting for admin confirmation, mark it as canceled
      if (order.status === "WAITING_FOR_ADMIN_CONFIRMATION") {
        await prisma.$transaction(async (tx: any) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: "CANCELED" },
          });

          if (order.couponId) {
            await tx.userCoupon.update({
              where: { id: order.couponId },
              data: { isUsed: false, usedAt: null },
            });
          }

          if (order.voucherId) {
            await tx.voucher.update({
              where: { id: order.voucherId },
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
        console.log(`[Worker] Order ${orderId} status set to CANCELED (admin timeout).`);
      } else {
        console.log(`[Worker] Order ${orderId} status is ${order.status}, skipping admin timeout.`);
      }
    }
  },
  { connection: redisConnection }
);

orderWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

orderWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
});
