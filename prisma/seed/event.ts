import { prisma } from "../seed";

async function eventSeeder() {
  const event1 = await prisma.event.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Tech Conference 2024",
      description: "A conference about the latest in tech.",
      date: new Date("2024-09-15"),
      location: "San Francisco, CA",
      image: "https://example.com/event1.jpg",
      eventType: "CONFERENCE",
      eventPaid: true,
      eventPrice: 150000,
      createdBy: 1, // Assuming this user ID exists
    },
  });

  console.log("Seeded event:", event1);
}

export default eventSeeder;
