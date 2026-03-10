import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;

                    const user = await db.query.usersTable.findFirst({
                        where: eq(usersTable.email, email),
                    });

                    if (!user) return null;

                    if (user.status !== "ACTIVE") {
                        // They exist but aren't active (PENDING or REJECTED)
                        throw new Error(`Your account is currently ${user.status.toLowerCase()}.`);
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
                    if (passwordsMatch) {
                        return {
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            buildingId: user.buildingId,
                        } as any;
                    }
                }
                return null; // Invalid credentials
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.buildingId = (user as any).buildingId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role;
                (session.user as any).buildingId = token.buildingId;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
});
