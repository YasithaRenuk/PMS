import "dotenv/config";
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from "@/app/generated/prisma/client";
import { PrismaTiDBCloud } from "@tidbcloud/prisma-adapter";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

// const adapter = new PrismaMariaDb({
//   host: process.env.TIDB_HOST,
//   user: process.env.TIDB_USER,
//   password: process.env.TIDB_PASSWORD,
//   database: process.env.TIDB_DATABASE,
//   port: process.env.TIDB_PORT ? Number(process.env.TIDB_PORT) : 4000,
//   connectionLimit: 5,
//   ssl: {
//     rejectUnauthorized: true, 
//   },
// });

const adapter = new PrismaTiDBCloud({
  url: process.env.DATABASE_URL
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
