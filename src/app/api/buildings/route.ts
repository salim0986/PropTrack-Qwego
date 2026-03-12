import { auth } from "@/lib/auth";
import { db } from "@/db";
import { buildingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/buildings — public endpoint for building picker on registration
// GET /api/buildings?mine=1 — manager-only: returns their buildings with full settings
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        if (searchParams.get("mine") === "1") {
            const session = await auth();
            if (!session?.user?.id || session.user.role !== "MANAGER") {
                return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            }
            const buildings = await db.query.buildingsTable.findMany({
                where: eq(buildingsTable.managerId, session.user.id),
                columns: {
                    id: true, name: true, address: true, emergencyPhone: true,
                    businessHoursStart: true, businessHoursEnd: true, businessDays: true,
                },
            });
            return NextResponse.json(buildings);
        }

        // Public: registration building picker
        const buildings = await db.query.buildingsTable.findMany({
            columns: { id: true, name: true, address: true },
            orderBy: (b, { asc }) => [asc(b.name)],
        });
        return NextResponse.json(buildings);
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
