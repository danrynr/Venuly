import { prisma } from "../seed";

async function rolePermissionSeeder() {
  const customerRole = await prisma.role.findUnique({
    where: { name: "customer" },
  });

  const organizerRole = await prisma.role.findUnique({
    where: { name: "organizer" },
  });

  if (!customerRole || !organizerRole) {
    console.error("Roles not found. Please run roleSeeder first.");
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: {
      name: {
        in: [
          "register_event",
          "register_with_referral",
          "edit_profile",
          "manage_events",
          "view_analytics",
          "manage_transactions",
        ],
      },
    },
  });

  const rolePermissions = [
    { roleId: customerRole.id, permissionName: "register_event" },
    { roleId: customerRole.id, permissionName: "register_with_referral" },
    { roleId: customerRole.id, permissionName: "edit_profile" },
    { roleId: organizerRole.id, permissionName: "manage_events" },
    { roleId: organizerRole.id, permissionName: "view_analytics" },
    { roleId: organizerRole.id, permissionName: "manage_transactions" },
    { roleId: organizerRole.id, permissionName: "edit_profile" },
  ];

  for (const rp of rolePermissions) {
    const permission = permissions.find((p) => p.name === rp.permissionName);
    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: rp.roleId,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: rp.roleId,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log("Seeded role permissions successfully.");
}

export default rolePermissionSeeder;
