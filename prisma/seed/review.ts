import { prisma } from "../seed";

async function reviewSeeder() {
  const registrations = await prisma.eventRegistration.findMany({
    take: 10,
    include: {
      event: true,
    },
  });

  if (registrations.length === 0) {
    console.log("No registrations found for review seeding.");
    return;
  }

  const reviews = [
    { rating: 5, comment: "Amazing event! Highly recommended." },
    { rating: 4, comment: "Very informative session." },
    { rating: 5, comment: "Great organization and speakers." },
    { rating: 3, comment: "It was okay, but could be better." },
    { rating: 4, comment: "Nice experience overall." },
  ];

  for (let i = 0; i < Math.min(registrations.length, reviews.length); i++) {
    const reg = registrations[i];
    const reviewData = reviews[i];

    // Check if review already exists
    const existing = await prisma.review.findUnique({
      where: {
        userId_eventId: {
          userId: reg!.userId,
          eventId: reg!.eventId,
        },
      },
    });

    if (!existing) {
      const review = await prisma.review.create({
        data: {
          userId: reg!.userId,
          eventId: reg!.eventId,
          rating: reviewData!.rating,
          comment: reviewData!.comment,
        },
      });

      // Update event rating
      const aggregate = await prisma.review.aggregate({
        where: { eventId: reg!.eventId },
        _avg: { rating: true },
      });

      await prisma.event.update({
        where: { id: reg!.eventId },
        data: { rating: aggregate._avg.rating || 0 },
      });
    }
  }

  console.log("Seeded reviews.");
}

export default reviewSeeder;
