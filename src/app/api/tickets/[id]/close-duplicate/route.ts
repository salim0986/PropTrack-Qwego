import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ticketsTable, activityLogsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({ duplicateOfId: z.string().min(1) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "MANAGER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { duplicateOfId } = schema.parse(await req.json());

        // Verify the duplicate ticket exists
        const duplicateTicket = await db.query.ticketsTable.findFirst({
            where: eq(ticketsTable.id, id),
            with: { tenant: { columns: { id: true, name: true } } },
        });
        if (!duplicateTicket) return NextResponse.json({ message: "Ticket not found" }, { status: 404 });

        // Verify the parent (original) ticket exists
        const originalTicket = await db.query.ticketsTable.findFirst({
            where: eq(ticketsTable.id, duplicateOfId),
            columns: { id: true, title: true },
        });
        if (!originalTicket) {
            return NextResponse.json({ message: "Parent ticket not found" }, { status: 404 });
        }

        // Prevent closing a ticket as duplicate of itself
        if (id === duplicateOfId) {
            return NextResponse.json({ message: "A ticket cannot be a duplicate of itself" }, { status: 400 });
        }

        await db.transaction(async (tx) => {
            await tx.update(ticketsTable)
                .set({ status: "CLOSED_DUPLICATE", duplicateOfId })
                .where(eq(ticketsTable.id, id));

            await tx.insert(activityLogsTable).values({
                ticketId: id,
                actorId: session.user.id!,
                action: "CLOSED_DUPLICATE",
                message: `Closed as duplicate of "${originalTicket.title}" (#${duplicateOfId.slice(0, 8)})`,
                newValue: duplicateOfId,
            });
        });

        // Notify the tenant of the duplicate ticket — spec says "never just 'Closed'"
        await sendNotification({
            userId: duplicateTicket.tenantId,
            ticketId: id,
            title: "Your request has been merged",
            message: `Your issue has been merged with an existing report and is actively being handled. Track progress on the original ticket.`,
            type: "CLOSED_DUPLICATE",
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        if (e.name === "ZodError") return NextResponse.json({ message: e.errors[0].message }, { status: 400 });
        console.error("Close duplicate error:", e);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
