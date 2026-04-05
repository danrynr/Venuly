import { prisma } from "../seed";

async function roleSeeder() {
  const customer = await prisma.role.upsert({
    where: { name: "customer" },
    update: {},
    create: {
      name: "customer",
      description: "A customer role with limited access to the system.",
    },
  });

  const organizer = await prisma.role.upsert({
    where: { name: "organizer" },
    update: {},
    create: {
      name: "organizer",
      description:
        "An organizer role with permissions to manage events and view analytics.",
    },
  });

  const admin = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      description: "An admin role with permissions to manage everything.",
    },
  });

  console.log("Seeded roles:", { customer, organizer, admin });
}

export default roleSeeder;
