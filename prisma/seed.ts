import "dotenv/config";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from "@/app/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 4000,
  connectionLimit: 5,
  ssl: {
    rejectUnauthorized: true, 
  },
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const branch = await prisma.branch.upsert({
    where: { id: 1 },
    update: {
      branch_name: "main",
      show_id: "1",
    },
    create: {
      id: 1,
      branch_name: "main",
      show_id: "1",
    },
  });

  const passwordHash = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { username: "rootfo" },
    update: {
      password: passwordHash,
      role: Role.superAdmin,
      branchId: branch.id,
    },
    create: {
      username: "rootfo",
      password: passwordHash,
      role: Role.superAdmin,
      branchId: branch.id,
    },
  });
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
