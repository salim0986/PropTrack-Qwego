import { auth } from "@/lib/auth";
import { db } from "@/db";
import { registrationRequestsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notify";
import { z } from "zod";

const actionSchema = z.object({
    action: z.enum(["approve", "reject"]),
    reason: z.string().optional(),
});

// PATCH /api/registrations/[id] — approve or reject a technician registration
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.id || session.user.role !== "MANAGER") {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { action, reason } = actionSchema.parse(await req.json());

        if (action === "reject" && !reason?.trim()) {
            return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 });
        }

        // Fetch the registration request to get userId
        const request = await db.query.registrationRequestsTable.findFirst({
            where: eq(registrationRequestsTable.id, id),
            with: { user: { columns: { id: true, name: true, email: true } } },
        });

        if (!request) return NextResponse.json({ message: "Registration request not found" }, { status: 404 });
        if (request.status !== "PENDING") {
            return NextResponse.json({ message: "This request has already been reviewed" }, { status: 409 });
        }

        const isApprove = action === "approve";

        await db.transaction(async (tx) => {
            // Update user status
            await tx.update(usersTable)
                .set({ status: isApprove ? "ACTIVE" : "REJECTED" })
                .where(eq(usersTable.id, request.userId));

            // Update registration request
            await tx.update(registrationRequestsTable)
                .set({
                    status: isApprove ? "APPROVED" : "REJECTED",
                    reviewedBy: session.user.id,
                    reviewedAt: new Date(),
                    rejectionReason: reason ?? null,
                })
                .where(eq(registrationRequestsTable.id, id));
        });

        // Notify the technician
        await sendNotification({
            userId: request.userId,
            title: isApprove ? "✅ Application Approved!" : "Application Not Approved",
            message: isApprove
                ? "Your technician account has been approved. You can now log in to PropTrack."
                : `Your application was not approved. Reason: ${reason}`,
            type: isApprove ? "APPROVED" : "REJECTED",
        });

        return NextResponse.json({ success: true, action });
    } catch (e: any) {
        if (e?.name === "ZodError" || e?.issues) {
            const message = e?.errors?.[0]?.message ?? e?.issues?.[0]?.message ?? "Invalid request";
            return NextResponse.json({ message }, { status: 400 });
        }
        console.error("Registration action error:", e);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
