import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notificationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// PATCH /api/notifications/read-all — mark all of current user's notifications as read
export async function PATCH() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        await db
            .update(notificationsTable)
            .set({ read: true })
            .where(eq(notificationsTable.userId, session.user.id));

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
