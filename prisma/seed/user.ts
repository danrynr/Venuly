import { prisma } from "../seed";
import * as bcrypt from "bcrypt";
import { generateCouponCode } from "../../src/utils/codeGenerator";

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
      referralCode: "ORGAN1REF",
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
      referralCode: "CUSTO1REF",
    },
  });

  // Seed 60 additional Indonesian customers
  const firstNames = [
    "Budi",
    "Siti",
    "Agus",
    "Dewi",
    "Eko",
    "Ani",
    "Bambang",
    "Rini",
    "Dedi",
    "Sri",
    "Andi",
    "Maya",
    "Hendra",
    "Indah",
    "Rudi",
    "Lestari",
    "Anto",
    "Fitri",
    "Tono",
    "Sari",
    "Joko",
    "Kartini",
    "Mulyono",
    "Ratna",
    "Slamet",
    "Yanti",
    "Asep",
    "Lilis",
    "Dadang",
    "Eneng",
    "Fajar",
    "Gita",
    "Hafiz",
    "Ira",
    "Jajang",
    "Kiki",
    "Lutfi",
    "Mira",
    "Nana",
    "Oki",
    "Panji",
    "Qori",
    "Rian",
    "Siska",
    "Taufik",
    "Uli",
    "Vina",
    "Wawan",
    "Xena",
    "Yuda",
    "Zaki",
    "Amelia",
    "Bagir",
    "Citra",
    "Dian",
    "Euis",
    "Farhan",
    "Ghani",
    "Hesti",
    "Iwan",
  ];
  const lastNames = [
    "Saputra",
    "Wijaya",
    "Kurniawan",
    "Sari",
    "Setiawan",
    "Pratama",
    "Utami",
    "Hidayat",
    "Susanti",
    "Nugroho",
    "Wulandari",
    "Santoso",
    "Lestari",
    "Gunawan",
    "Rahayu",
    "Budiman",
    "Permata",
    "Suryanto",
    "Puspita",
    "Siregar",
    "Mulyadi",
    "Kusuma",
    "Hardianto",
    "Nasution",
    "Siahaan",
    "Ginting",
    "Pohan",
    "Sitorus",
    "Sinaga",
    "Pasaribu",
    "Lubis",
    "Harahap",
    "Ritonga",
    "Pane",
    "Batubara",
    "Tanjung",
    "Daulay",
    "Matondang",
    "Simanjuntak",
    "Sumbayak",
    "Saragih",
    "Damanik",
    "Purba",
    "Girsang",
    "Munthe",
    "Sipayung",
    "Haloho",
    "Sinurat",
    "Manurung",
    "Pardede",
    "Situmorang",
    "Silaen",
    "Nababan",
    "Hutagalung",
    "Hutapea",
    "Hutauruk",
    "Hutabarat",
    "Lumbantobing",
    "Aritonang",
    "Bawole",
  ];

  const customerRole = await prisma.role.findFirst({
    where: { name: "customer" },
  });

  const pointsPerUser = parseInt(process.env.POINT_PER_USER!) || 10000;
  const discountAmount = parseInt(process.env.REFERRAL_DISCOUNT_AMOUNT!) || 10;
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 3);

  const seededUsers = [customer1];

  for (let i = 0; i < 60; i++) {
    const firstName = firstNames[i]!;
    const lastName = lastNames[i]!;
    const email = `customer${i + 2}@mail.com`;

    // Logic: Diversified referral distribution
    // User 1 (customer1) refers 15 people
    // User 2 (customer2) refers 10 people
    // User 3 (customer3) refers 5 people
    // User 4 (customer4) refers 3 people
    // Others might refer 1 or 0
    let referrer: any = null;
    if (i < 15) {
      referrer = customer1;
    } else if (i < 25) {
      referrer = seededUsers[1]; // customer2 (to be added)
    } else if (i < 30) {
      referrer = seededUsers[2]; // customer3
    } else if (i < 33) {
      referrer = seededUsers[3]; // customer4
    } else if (i < 40) {
      referrer = seededUsers[i - 5]; // Random-ish static chain
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        firstName,
        lastName,
        email,
        password: customerPassword1,
        referralCode: `${firstName.substring(0, 4).toUpperCase()}${i + 2}REF`,
      },
    });

    seededUsers.push(user);

    // Assign Role
    if (customerRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: customerRole.id } },
        update: {},
        create: { userId: user.id, roleId: customerRole.id },
      });
    }

    // Create Referral link and award points/coupons if referrer exists
    if (referrer) {
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          reffereeId: user.id,
        },
      });

      // Referrer gets points for every successful referral
      await prisma.userPoint.create({
        data: {
          userId: referrer.id,
          points: pointsPerUser,
          expiredAt: expiryDate,
        },
      });

      // Referee (new user) gets a coupon for being referred
      await prisma.userCoupon.create({
        data: {
          userId: user.id,
          couponCode: generateCouponCode("COUP"),
          discount: discountAmount,
          expiredAt: expiryDate,
        },
      });
    }
  }

  console.log(
    "Seeded 60 users with varied referral logic, points, and coupons.",
  );
}

export default userSeeder;
