import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ticketsTable, ticketImagesTable, activityLogsTable, usersTable, buildingsTable } from "@/db/schema";
import { ticketSchema } from "@/lib/validations";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { sendNotification } from "@/lib/notify";
import { isAfterHours } from "@/lib/after-hours";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const userId = session.user.id;
        const body = await req.json();
        const validatedData = ticketSchema.parse(body);

        // Fetch user's building
        const user = await db.query.usersTable.findFirst({
            where: eq(usersTable.id, session.user.id!),
            columns: { buildingId: true, unitNumber: true },
        });

        if (!user?.buildingId || !user?.unitNumber) {
            return NextResponse.json({ message: "User profile incomplete. Building/Unit missing." }, { status: 400 });
        }

        const ticketAfterHours = isAfterHours();

        // 1. Transactional Insert
        const result = await db.transaction(async (tx) => {
            const [ticket] = await tx.insert(ticketsTable).values({
                title: validatedData.title,
                description: validatedData.description,
                category: validatedData.category as any,
                priority: (validatedData.priority as any) || "MEDIUM",
                tenantId: userId,
                buildingId: user.buildingId!,
                unitNumber: user.unitNumber!,
                submittedAfterHours: ticketAfterHours,
            }).returning();

            // Create Images
            if (validatedData.imageUrls && validatedData.imageUrls.length > 0) {
                await tx.insert(ticketImagesTable).values(
                    validatedData.imageUrls.map(url => ({
                        ticketId: ticket.id,
                        url,
                        uploadedBy: userId,
                        type: "REPORT" as const,
                    }))
                );
            }

            // Create Activity Log
            await tx.insert(activityLogsTable).values({
                ticketId: ticket.id,
                actorId: userId,
                action: "CREATED" as const,
                message: "Ticket created by tenant",
            });

            return ticket;
        });

        // 2. Notify Manager (Async)
        // Find manager for this building
        const building = await db.query.buildingsTable.findFirst({
            where: eq(buildingsTable.id, user.buildingId!),
            columns: { managerId: true, name: true }
        });

        if (building) {
            await sendNotification({
                userId: building.managerId,
                ticketId: result.id,
                title: "New Ticket Reported",
                message: `Tenant in Unit ${user.unitNumber} (${building.name}) reported: ${result.title}`,
                type: "TICKET_CREATED",
            });
        }

        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error("Ticket Creation Error:", error);
        if (error.name === "ZodError") {
            return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
