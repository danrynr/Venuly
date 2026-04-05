import { prisma } from "../seed";

async function eventSeeder() {
  const events = [
    {
      id: 1,
      name: "Tech Conference 2024",
      description: "A conference about the latest in tech.",
      date: new Date("2024-09-15T09:00:00Z"),
      endDate: new Date("2024-09-15T17:00:00Z"),
      location: "San Francisco, CA",
      image: "https://example.com/event1.jpg",
      eventType: "CONFERENCE" as const,
      eventPaid: true,
      eventPrice: 150000,
      capacity: 100,
      createdBy: 1,
    },
    {
      id: 2,
      name: "Music Festival 2025",
      description: "An outdoor music festival with various artists.",
      date: new Date("2025-08-20T12:00:00Z"),
      endDate: new Date("2025-08-22T23:00:00Z"),
      location: "Jakarta, Indonesia",
      image: "https://example.com/event2.jpg",
      eventType: "FESTIVAL" as const,
      eventPaid: true,
      eventPrice: 100000,
      capacity: 500,
      createdBy: 1,
    },
    {
      id: 3,
      name: "Local Meetup",
      description: "A casual meetup for local tech enthusiasts.",
      date: new Date("2026-07-10"),
      endDate: new Date("2026-07-10T21:00:00Z"),
      location: "Bandung, Indonesia",
      image: "https://example.com/event3.jpg",
      eventType: "MEETUP" as const,
      eventPaid: false,
      capacity: 50,
      createdBy: 1,
    },
    {
      id: 4,
      name: "IT Infrastructure Seminar",
      description: "A seminar focused on IT infrastructure and cloud solutions.",
      date: new Date("2026-03-15T17:00:00Z"),
      endDate: new Date("2026-03-15T21:00:00Z"),
      location: "Jakarta, Indonesia",
      image: "https://example.com/event4.jpg",
      eventType: "WORKSHOP" as const,
      eventPaid: true,
      eventPrice: 200000,
      capacity: 80,
      createdBy: 1,
    },
    {
      id: 5,
      name: "Cloud Computing Workshop",
      description: "Hands-on workshop about cloud computing services.",
      date: new Date("2026-03-20T16:00:00Z"),
      endDate: new Date("2026-03-20T20:00:00Z"),
      location: "Jakarta, Indonesia",
      image: "https://example.com/event4.jpg",
      eventType: "WORKSHOP" as const,
      eventPaid: true,
      eventPrice: 200000,
      capacity: 80,
      createdBy: 1,
    },
  ];

  for (const e of events) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: {
        endDate: e.endDate,
        name: e.name,
        description: e.description,
        date: e.date,
        location: e.location,
        image: e.image,
        eventType: e.eventType,
        eventPaid: e.eventPaid,
        eventPrice: e.eventPrice,
        capacity: e.capacity,
      },
      create: e,
    });
  }

  console.log("Seeded and updated events.");
}

export default eventSeeder;
