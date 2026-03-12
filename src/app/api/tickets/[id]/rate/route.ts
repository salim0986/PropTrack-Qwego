import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ticketsTable, ticketRatingsTable, activityLogsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { rateTicketSchema } from "@/lib/validations";
import { sendNotification } from "@/lib/notify";

// POST /api/tickets/[id]/rate — tenant submits satisfaction rating after DONE
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const role = session.user.role;
        if (role !== "TENANT") {
            return NextResponse.json({ message: "Only tenants can rate tickets" }, { status: 403 });
        }

        const ticket = await db.query.ticketsTable.findFirst({
            where: eq(ticketsTable.id, id),
            with: {
                building: { columns: { managerId: true } },
                technician: { columns: { id: true, name: true } },
                rating: true,
            },
        });

        if (!ticket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

        // Must be the tenant who owns this ticket
        if (ticket.tenantId !== session.user.id) {
            return NextResponse.json({ message: "You can only rate your own tickets" }, { status: 403 });
        }

        // Ticket must be DONE
        if (ticket.status !== "DONE") {
            return NextResponse.json({ message: "Ratings can only be submitted after a ticket is resolved" }, { status: 400 });
        }

        // Prevent duplicate rating (unless it's been voided by reopen — but after reopen status is REOPENED, not DONE)
        if (ticket.rating) {
            return NextResponse.json({ message: "You have already rated this ticket" }, { status: 409 });
        }

        const { rating, comment } = rateTicketSchema.parse(await req.json());

        await db.transaction(async (tx) => {
            await tx.insert(ticketRatingsTable).values({
                ticketId: id,
                tenantId: session.user.id,
                rating,
                comment: comment ?? null,
            });

            await tx.insert(activityLogsTable).values({
                ticketId: id,
                actorId: session.user.id,
                action: "RATED",
                newValue: String(rating),
                message: comment ? `Tenant rated ${rating}/5 stars: "${comment}"` : `Tenant rated ${rating}/5 stars`,
            });
        });

        // Notify manager with rating summary (Discord digest per spec)
        if (ticket.building?.managerId) {
            await sendNotification({
                userId: ticket.building.managerId,
                ticketId: id,
                title: "New Rating Received",
                message: `Tenant rated "${ticket.title}" — ${rating}/5 stars${comment ? `: "${comment}"` : ""}. Assigned to ${ticket.technician?.name || "Unknown"}.`,
                type: "COMPLETION_SUBMITTED",
            });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        if (e?.name === "ZodError" || e?.issues) {
            const message = e?.errors?.[0]?.message ?? e?.issues?.[0]?.message ?? "Invalid rating data";
            return NextResponse.json({ message }, { status: 400 });
        }
        console.error("Rate ticket error:", e);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
