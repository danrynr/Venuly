import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import roleSeeder from "./seed/role";
import permissionSeeder from "./seed/permission";
import rolePermissionSeeder from "./seed/rolePermission";
import userSeeder from "./seed/user";
import userRoleSeeder from "./seed/userRole";
import eventSeeder from "./seed/event";
import orderSeeder from "./seed/order";
import voucherSeeder from "./seed/voucher";
import reviewSeeder from "./seed/review";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
export const prisma = new PrismaClient({ adapter });

async function seeder() {
  await roleSeeder();
  await permissionSeeder();
  await rolePermissionSeeder();
  await userSeeder();
  await userRoleSeeder();
  await eventSeeder();
  await orderSeeder();
  await voucherSeeder();
  await reviewSeeder();
}

seeder()
  .then(async () => {
    await prisma.$disconnect();
  })
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
