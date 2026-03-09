import { prisma } from "../seed";

async function eventSeeder() {
  const event1 = await prisma.event.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Tech Conference 2024",
      description: "A conference about the latest in tech.",
      date: new Date("2024-09-15T09:00:00Z"),
      location: "San Francisco, CA",
      image: "https://example.com/event1.jpg",
      eventType: "CONFERENCE",
      eventPaid: true,
      eventPrice: 150000,
      capacity: 100,
      createdBy: 1, // Assuming this user ID exists
    },
  });

  const event2 = await prisma.event.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Music Festival 2025",
      description: "An outdoor music festival with various artists.",
      date: new Date("2025-08-20T12:00:00Z"),
      location: "Jakarta, Indonesia",
      image: "https://example.com/event2.jpg",
      eventType: "FESTIVAL",
      eventPaid: true,
      eventPrice: 100000,
      capacity: 500,
      createdBy: 1, // Assuming this user ID exists
    },
  });

  const event3 = await prisma.event.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Local Meetup",
      description: "A casual meetup for local tech enthusiasts.",
      date: new Date("2026-07-10"),
      location: "Bandung, Indonesia",
      image: "https://example.com/event3.jpg",
      eventType: "MEETUP",
      eventPaid: false,
      capacity: 50,
      createdBy: 1, // Assuming this user ID exists
    },
  });

  const event4 = await prisma.event.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: "IT Infrastructure Seminar",
      description:
        "A seminar focused on IT infrastructure and cloud solutions.",
      date: new Date("2026-03-15T17:00:00Z"),
      location: "Jakarta, Indonesia",
      image: "https://example.com/event4.jpg",
      eventType: "WORKSHOP",
      eventPaid: true,
      eventPrice: 200000,
      capacity: 80,
      createdBy: 1, // Assuming this user ID exists
    },
  });

  const event5 = await prisma.event.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: "IT Infrastructure Seminar",
      description:
        "A seminar focused on IT infrastructure and cloud solutions.",
      date: new Date("2026-03-20T16:00:00Z"),
      location: "Jakarta, Indonesia",
      image: "https://example.com/event4.jpg",
      eventType: "WORKSHOP",
      eventPaid: true,
      eventPrice: 200000,
      capacity: 80,
      createdBy: 1, // Assuming this user ID exists
    },
  });

  console.log("Seeded event:", event1, event2, event3, event4, event5);
}

export default eventSeeder;
