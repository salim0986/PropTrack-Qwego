import { auth } from "@/lib/auth";
import { db } from "@/db";
import { buildingsTable, escalationRulesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

const settingsSchema = z.object({
    businessHoursStart: z.number().int().min(0).max(23).optional(),
    businessHoursEnd: z.number().int().min(1).max(24).optional(),
    businessDays: z.array(z.number().int().min(0).max(6)).optional(),
    emergencyPhone: z.string().optional().nullable(),
});

// PATCH /api/buildings/[id]/settings
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "MANAGER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const building = await db.query.buildingsTable.findFirst({
            where: eq(buildingsTable.id, id),
            columns: { id: true, managerId: true },
        });

        if (!building) return NextResponse.json({ message: "Building not found" }, { status: 404 });

        // Ensure manager is the manager of THIS building
        if (building.managerId !== session.user.id) {
            return NextResponse.json({ message: "You do not manage this building" }, { status: 403 });
        }

        const body = settingsSchema.parse(await req.json());

        await db.update(buildingsTable)
            .set({
                ...(body.businessHoursStart !== undefined && { businessHoursStart: body.businessHoursStart }),
                ...(body.businessHoursEnd !== undefined && { businessHoursEnd: body.businessHoursEnd }),
                ...(body.businessDays !== undefined && { businessDays: body.businessDays }),
                ...(body.emergencyPhone !== undefined && { emergencyPhone: body.emergencyPhone }),
            })
            .where(eq(buildingsTable.id, id));

        return NextResponse.json({ success: true });
    } catch (e: any) {
        if (e.name === "ZodError") return NextResponse.json({ message: e.errors[0].message }, { status: 400 });
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// GET /api/buildings/[id]/settings
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "MANAGER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const building = await db.query.buildingsTable.findFirst({
            where: eq(buildingsTable.id, id),
            columns: {
                id: true, name: true, emergencyPhone: true,
                businessHoursStart: true, businessHoursEnd: true, businessDays: true,
            },
        });

        if (!building) return NextResponse.json({ message: "Building not found" }, { status: 404 });
        return NextResponse.json(building);
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
