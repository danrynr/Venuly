import { prisma } from "../seed";
import { OrderStatus } from "../../generated/prisma/client";

async function orderSeeder() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: "customer" } },
    take: 60,
    orderBy: { id: "asc" },
  });

  const events = await prisma.event.findMany({
    take: 5,
    orderBy: { id: "asc" },
  });

  if (users.length === 0 || events.length === 0) {
    console.log("No users or events found for order seeding.");
    return;
  }

  // Distribution for 60 users (scaled from 20):
  // WAITING_FOR_PAYMENT: 6 * 3 = 18
  // WAITING_FOR_ADMIN_CONFIRMATION: 6 * 3 = 18
  // DONE: 4 * 3 = 12
  // REJECTED: 1 * 3 = 3
  // EXPIRED: 1 * 3 = 3
  // CANCELED: 2 * 3 = 6
  // Total = 18+18+12+3+3+6 = 60

  for (let i = 0; i < users.length; i++) {
    const user = users[i]!;
    const event = events[i % events.length]!;

    let status: OrderStatus;
    if (i < 18) {
      status = "WAITING_FOR_PAYMENT";
    } else if (i < 36) {
      status = "WAITING_FOR_ADMIN_CONFIRMATION";
    } else if (i < 48) {
      status = "DONE";
    } else if (i < 51) {
      status = "REJECTED";
    } else if (i < 54) {
      status = "EXPIRED";
    } else {
      status = "CANCELED";
    }

    const basePrice = event.eventPrice;
    const discount = 0n; // Simple seeding without complex calculation
    const pointsUsed = 0n;
    const totalPrice = basePrice;

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 2);

    await prisma.order.create({
      data: {
        userId: user.id,
        eventId: event.id,
        quantity: 1,
        basePrice,
        discount,
        pointsUsed,
        totalPrice,
        status,
        expiresAt,
      },
    });

    // If status is DONE, also create an event registration
    if (status === "DONE") {
      await prisma.eventRegistration.upsert({
        where: {
          userId_eventId: {
            userId: user.id,
            eventId: event.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          eventId: event.id,
        },
      });
    }
  }

  console.log("Seeded 20 event transactions (orders).");
}

export default orderSeeder;
