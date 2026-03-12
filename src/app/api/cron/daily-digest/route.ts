import { db } from "@/db";
import { ticketsTable, usersTable } from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notify";

function isCronAuthorized(req: Request): boolean {
    const authHeader = req.headers.get("authorization");
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return authHeader === `Bearer ${secret}`;
}

export async function GET(req: Request) {
    if (!isCronAuthorized(req)) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all managers
    const managers = await db.query.usersTable.findMany({
        where: eq(usersTable.role, "MANAGER"),
        with: {
            managedBuildings: { columns: { id: true, name: true } },
        },
    });

    for (const manager of managers) {
        const buildingIds = manager.managedBuildings?.map((b: any) => b.id) ?? [];
        if (buildingIds.length === 0) continue;

        // Aggregate data per manager
        const [tickets, pendingApprovals] = await Promise.all([
            db.query.ticketsTable.findMany({
                where: inArray(ticketsTable.buildingId, buildingIds),
                columns: {
                    id: true, status: true, priority: true,
                    technicianId: true, submittedAfterHours: true,
                    resolvedAt: true, createdAt: true,
                },
            }),
            db.query.usersTable.findMany({
                where: and(eq(usersTable.role, "TECHNICIAN"), eq(usersTable.status, "PENDING")),
                columns: { id: true },
            }),
        ]);

        const urgent = tickets.filter((t) => t.priority === "URGENT" && !["DONE", "CLOSED_DUPLICATE"].includes(t.status)).length;
        const unassigned = tickets.filter((t) => t.status === "OPEN" && !t.technicianId).length;
        const blocked = tickets.filter((t) => t.status === "BLOCKED").length;
        const overnight = tickets.filter((t) => t.submittedAfterHours && new Date(t.createdAt) >= yesterday).length;
        const resolvedYesterday = tickets.filter(
            (t) => t.resolvedAt && new Date(t.resolvedAt) >= yesterday && new Date(t.resolvedAt) < todayStart
        ).length;

        const message = [
            `📊 *PropTrack Morning Report — ${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })}*`,
            ``,
            `🔴 Urgent / Open: ${urgent} tickets`,
            `⚠️ Unassigned: ${unassigned} tickets`,
            `🟡 Blocked: ${blocked} tickets`,
            `🌙 Submitted overnight: ${overnight} tickets`,
            `✅ Resolved yesterday: ${resolvedYesterday} tickets`,
            `👥 Pending approvals: ${pendingApprovals.length} requests`,
        ].join("\n");

        await sendNotification({
            userId: manager.id,
            title: "Morning Report",
            message,
            type: "DAILY_DIGEST",
        });
    }

    return NextResponse.json({ digest: "sent", managers: managers.length, timestamp: now.toISOString() });
}
