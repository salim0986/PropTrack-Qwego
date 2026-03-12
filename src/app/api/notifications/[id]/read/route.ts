import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notificationsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// PATCH /api/notifications/[id]/read — mark single notification as read
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        // Must belong to the current user
        await db
            .update(notificationsTable)
            .set({ read: true })
            .where(
                and(
                    eq(notificationsTable.id, id),
                    eq(notificationsTable.userId, session.user.id)
                )
            );

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
