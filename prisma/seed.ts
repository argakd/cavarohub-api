import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const organizer = await prisma.user.upsert({
    where: { email: "admin@mail.com" },
    update: {},
    create: {
      email: "admin@mail.com",
      passwordHash,
      name: "Nadia Organizer",
      role: "ORGANIZER",
      referralCode: "ORGNAD01",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "joko@mail.com" },
    update: {},
    create: {
      email: "joko@mail.com",
      passwordHash,
      name: "Joko Customer",
      role: "CUSTOMER",
      referralCode: "JOKOREF1",
    },
  });

  const referredCustomer = await prisma.user.upsert({
    where: { email: "siti@mail.com" },
    update: {},
    create: {
      email: "siti@mail.com",
      passwordHash,
      name: "Siti Referred",
      role: "CUSTOMER",
      referralCode: "SITIREF1",
      referredById: customer.id,
    },
  });

  const now = new Date();
  const threeMonthsOut = new Date(now);
  threeMonthsOut.setMonth(threeMonthsOut.getMonth() + 3);

  await prisma.pointLedger.upsert({
    where: { id: "seed-referral-bonus-joko" },
    update: {},
    create: {
      id: "seed-referral-bonus-joko",
      userId: customer.id,
      amount: 10_000,
      reason: "REFERRAL_BONUS",
      expiresAt: threeMonthsOut,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "WELCOME-SITIREF1" },
    update: {},
    create: {
      code: "WELCOME-SITIREF1",
      userId: referredCustomer.id,
      discountType: "PERCENTAGE",
      discountValue: 10,
      expiresAt: threeMonthsOut,
    },
  });

  await prisma.category.upsert({
    where: { name: "Music" },
    update: {},
    create: { name: "Music" },
  });
  await prisma.category.upsert({
    where: { name: "Technology" },
    update: {},
    create: { name: "Technology" },
  });

  console.log("Seed complete. Demo accounts (all use the same password):");
  console.log(`  admin@mail.com / ${DEMO_PASSWORD}  (id: ${organizer.id})`);
  console.log(`  joko@mail.com  / ${DEMO_PASSWORD}  (id: ${customer.id}) — referral code JOKOREF1`);
  console.log(`  siti@mail.com  / ${DEMO_PASSWORD}  (id: ${referredCustomer.id}) — registered using JOKOREF1`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
