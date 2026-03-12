import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ticketsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import { TenantTicketDetailClient } from "./TicketDetailClient";

export default async function TenantTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const ticket = await db.query.ticketsTable.findFirst({
        where: eq(ticketsTable.id, id),
        with: {
            building: { columns: { name: true, address: true } },
            technician: { columns: { name: true, phone: true } },
            images: { columns: { url: true, type: true } },
            activityLogs: {
                with: { actor: { columns: { name: true, role: true } } },
                orderBy: (l, { desc }) => [desc(l.createdAt)],
            },
            rating: true,
        },
    });

    if (!ticket) notFound();

    // Tenants can only view their own tickets
    if (ticket.tenantId !== session.user.id) redirect("/tenant/dashboard");

    return <TenantTicketDetailClient ticket={ticket} />;
}
