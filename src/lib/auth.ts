import { prisma } from "@/lib/prisma";
import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@/app/generated/prisma/enums";


type AuthorizedUser = {
  id: string;
  username: string;
  role: Role;
  branchId: number | null;
  branchName: string | null;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
          include: { branch: true },
        });

        if (!user) {
          throw new Error("Invalid username or password");
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid username or password");
        }

        return {
          id: user.id.toString(),
          username: user.username,
          role: user.role,
          branchId: user.branchId,
          branchName: user.branch?.branch_name ?? null,
        } satisfies AuthorizedUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const safeUser = user as AuthorizedUser;

        token.id = safeUser.id;
        token.username = safeUser.username;
        token.role = safeUser.role;
        token.branchId = safeUser.branchId ?? null;
        token.branchName = safeUser.branchName ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as Role;
        session.user.branchId = (token.branchId as number | null) ?? null;
        session.user.branchName = (token.branchName as string | null) ?? null;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const authHandler = NextAuth(authOptions);

export const getServerAuthSession = () => getServerSession(authOptions);
