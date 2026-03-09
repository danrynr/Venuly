import { prisma } from "../seed";
import * as bcrypt from "bcrypt";

async function userSeeder() {
  const hashedOrganizerPassword1 = await bcrypt.hash(
    process.env.ORGANIZER_PASSWORD!,
    parseInt(process.env.SALT_ROUNDS!),
  );

  const customerPassword1 = await bcrypt.hash(
    process.env.CUSTOMER_PASSWORD!,
    parseInt(process.env.SALT_ROUNDS!),
  );

  const organizer1 = await prisma.user.upsert({
    where: { email: "organizer1@mail.com" },
    update: {},
    create: {
      firstName: "Organizer",
      lastName: "One",
      email: "organizer1@mail.com",
      password: hashedOrganizerPassword1,
      referralCode: "ORGA1REF",
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: "customer1@mail.com" },
    update: {},
    create: {
      firstName: "Customer",
      lastName: "One",
      email: "customer1@mail.com",
      password: customerPassword1,
      referralCode: "CUST1REF",
    },
  });

  console.log("Seeded users:", { organizer1, customer1 });
}

export default userSeeder;
