import { auth } from "@/lib/auth";
import { db } from "@/db";
import { registrationRequestsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/registrations — manager sees all PENDING registration requests
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "MANAGER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const requests = await db.query.registrationRequestsTable.findMany({
            where: eq(registrationRequestsTable.status, "PENDING"),
            with: {
                user: {
                    columns: {
                        id: true, name: true, email: true, phone: true,
                        specialties: true, createdAt: true,
                    },
                },
            },
            orderBy: (r, { desc }) => [desc(r.requestedAt)],
        });

        return NextResponse.json(requests);
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
