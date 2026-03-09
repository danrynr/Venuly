import { prisma } from "../seed";

async function userRoleSeeder() {
  const orgRole = await prisma.role.findFirst({
    where: { name: "organizer" },
  });

  const customerRole = await prisma.role.findFirst({
    where: { name: "customer" },
  });

  const organizerUser = await prisma.user.findFirst({
    where: { email: "organizer1@mail.com" },
  });

  const customerUser = await prisma.user.findFirst({
    where: { email: "customer1@mail.com" },
  });

  if (orgRole && organizerUser) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: organizerUser.id,
          roleId: orgRole.id,
        },
      },
      update: {},
      create: {
        userId: organizerUser.id,
        roleId: orgRole.id,
      },
    });
  }

  if (customerRole && customerUser) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: customerUser.id,
          roleId: customerRole.id,
        },
      },
      update: {},
      create: {
        userId: customerUser.id,
        roleId: customerRole.id,
      },
    });
  }

  console.log("Seeded user roles for organizer and customer.");
}

export default userRoleSeeder;
