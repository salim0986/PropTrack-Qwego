import { auth } from "@/lib/auth";
import { db } from "@/db";
import { notificationsTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/notifications — current user's notification feed
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const notifications = await db.query.notificationsTable.findMany({
            where: eq(notificationsTable.userId, session.user.id),
            orderBy: [desc(notificationsTable.createdAt)],
            with: {
                ticket: { columns: { id: true, title: true } },
            },
        });

        return NextResponse.json(notifications);
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
