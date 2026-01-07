import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter';

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

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
