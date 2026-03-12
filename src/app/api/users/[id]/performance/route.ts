import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ticketsTable, ticketRatingsTable, activityLogsTable, usersTable } from "@/db/schema";
import { eq, and, count, avg } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/users/[id]/performance — technician performance stats for manager
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "MANAGER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Verify user exists and is a technician
        const tech = await db.query.usersTable.findFirst({
            where: eq(usersTable.id, id),
            columns: { id: true, name: true, role: true, specialties: true, email: true, phone: true },
        });

        if (!tech || tech.role !== "TECHNICIAN") {
            return NextResponse.json({ message: "Technician not found" }, { status: 404 });
        }

        // Tickets for this technician
        const allTickets = await db.query.ticketsTable.findMany({
            where: eq(ticketsTable.technicianId, id),
            with: {
                images: { columns: { type: true } },
                activityLogs: { columns: { action: true, createdAt: true } },
                rating: { columns: { rating: true } },
            },
        });

        const doneTickets = allTickets.filter((t) => t.status === "DONE" || t.resolvedAt);
        const blockedIncidents = allTickets.filter((t) =>
            t.activityLogs.some((log: any) => log.action === "BLOCKED")
        );
        const disputedCompletions = allTickets.filter((t) =>
            t.activityLogs.some((log: any) => log.action === "COMPLETION_DISPUTED")
        );

        // Photo compliance: DONE tickets that have at least 1 RESOLUTION image
        const withResolutionPhoto = doneTickets.filter((t) =>
            t.images.some((img: any) => img.type === "RESOLUTION")
        );
        const photoCompliance =
            doneTickets.length > 0
                ? Math.round((withResolutionPhoto.length / doneTickets.length) * 100)
                : 100;

        // Ratings
        const ratings = allTickets
            .filter((t) => t.rating !== null)
            .map((t) => t.rating!.rating);
        const avgRating =
            ratings.length > 0
                ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
                : null;

        // Average completion time (hours)
        const completionTimes = doneTickets
            .filter((t) => t.resolvedAt && t.createdAt)
            .map((t) => {
                const msElapsed = new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime();
                return msElapsed / 1000 / 60 / 60; // hours
            });
        const avgCompletionHrs =
            completionTimes.length > 0
                ? parseFloat((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1))
                : null;

        return NextResponse.json({
            technician: tech,
            stats: {
                jobsCompleted: doneTickets.length,
                avgCompletionHours: avgCompletionHrs,
                photoCompliance,
                avgRating,
                totalRatings: ratings.length,
                blockedIncidents: blockedIncidents.length,
                disputedCompletions: disputedCompletions.length,
            },
        });
    } catch {
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
