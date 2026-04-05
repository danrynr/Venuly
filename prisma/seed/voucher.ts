import { prisma } from "../seed";

async function voucherSeeder() {
  const events = await prisma.event.findMany({
    take: 5,
    orderBy: { id: "asc" },
  });

  if (events.length === 0) {
    console.log("No events found for voucher seeding.");
    return;
  }

  const vouchers = [
    {
      code: "TECH10",
      discount: 10,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      eventId: events[0].id,
    },
    {
      code: "MUSIC20",
      discount: 20,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      eventId: events[1].id,
    },
    {
      code: "SEMINAR50",
      discount: 50,
      startDate: new Date(),
      endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      eventId: events[3].id,
    },
  ];

  for (const v of vouchers) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {},
      create: v,
    });
  }

  console.log("Seeded vouchers.");
}

export default voucherSeeder;
