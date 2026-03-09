import { prisma } from "../seed";

async function permissionSeeder() {
  const registerEvent = await prisma.permission.upsert({
    where: { name: "register_event" },
    update: {},
    create: {
      name: "register_event",
      description: "Permission to register for events.",
    },
  });

  const registerWithReferral = await prisma.permission.upsert({
    where: { name: "register_with_referral" },
    update: {},
    create: {
      name: "register_with_referral",
      description: "Permission to register for events using a referral code.",
    },
  });

  const editProfile = await prisma.permission.upsert({
    where: { name: "edit_profile" },
    update: {},
    create: {
      name: "edit_profile",
      description: "Permission to edit user profile information.",
    },
  });

  const manageEvents = await prisma.permission.upsert({
    where: { name: "manage_events" },
    update: {},
    create: {
      name: "manage_events",
      description: "Permission to create, edit, and delete events.",
    },
  });

  const viewAnalytics = await prisma.permission.upsert({
    where: { name: "view_analytics" },
    update: {},
    create: {
      name: "view_analytics",
      description: "Permission to view event analytics and reports.",
    },
  });

  const manageTransactions = await prisma.permission.upsert({
    where: { name: "manage_transactions" },
    update: {},
    create: {
      name: "manage_transactions",
      description: "Permission to manage user transactions and payments.",
    },
  });

  console.log("Seeded permissions:", {
    registerEvent,
    registerWithReferral,
    editProfile,
    manageEvents,
    viewAnalytics,
    manageTransactions,
  });
}

export default permissionSeeder;
