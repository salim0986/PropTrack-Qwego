import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ticketsTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function TenantTicketsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const tickets = await db.query.ticketsTable.findMany({
        where: eq(ticketsTable.tenantId, session.user.id),
        orderBy: [desc(ticketsTable.createdAt)],
        with: {
            building: { columns: { name: true } },
            technician: { columns: { name: true } },
        },
    });

    const active = tickets.filter((t) => !["DONE", "CLOSED_DUPLICATE"].includes(t.status));
    const resolved = tickets.filter((t) => ["DONE", "CLOSED_DUPLICATE"].includes(t.status));

    return (
        <div className="flex flex-col gap-5 p-4 pb-28">
            {/* Header */}
            <div className="flex items-center gap-3 pt-1">
                <Link href="/tenant/dashboard">
                    <button className="w-9 h-9 rounded-xl bg-pt-surface-light border border-pt-border flex items-center justify-center">
                        <ChevronLeft className="w-4 h-4 text-pt-text" />
                    </button>
                </Link>
                <div>
                    <p className="text-pt-text-dim text-xs">My Requests</p>
                    <h1 className="text-xl font-bold text-pt-text tracking-tight">All Tickets</h1>
                </div>
            </div>

            {tickets.length === 0 ? (
                <Card className="border-dashed border-pt-border bg-transparent py-12">
                    <CardContent className="flex flex-col items-center gap-3 text-center">
                        <div className="bg-pt-surface-light p-4 rounded-full">
                            <Ticket className="w-8 h-8 text-pt-text-muted" />
                        </div>
                        <div>
                            <p className="text-pt-text font-medium">No tickets yet</p>
                            <p className="text-xs text-pt-text-dim mt-1">Report an issue from the home screen.</p>
                        </div>
                        <Link
                            href="/tenant/tickets/new"
                            className="mt-2 text-sm font-semibold text-pt-accent hover:underline"
                        >
                            Submit first request →
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Active */}
                    {active.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-pt-text-muted">
                                Active ({active.length})
                            </h2>
                            {active.map((ticket) => (
                                <TicketCard key={ticket.id} ticket={ticket} />
                            ))}
                        </section>
                    )}
                    {/* Resolved */}
                    {resolved.length > 0 && (
                        <section className="flex flex-col gap-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-pt-text-muted">
                                Resolved ({resolved.length})
                            </h2>
                            {resolved.map((ticket) => (
                                <TicketCard key={ticket.id} ticket={ticket} dim />
                            ))}
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

function TicketCard({ ticket, dim = false }: { ticket: any; dim?: boolean }) {
    return (
        <Link href={`/tenant/tickets/${ticket.id}`}>
            <Card
                className={`border-pt-border/60 hover:border-pt-accent/40 hover:shadow-md transition-all active:scale-[0.98] group overflow-hidden ${
                    dim ? "bg-pt-surface/50 opacity-70 hover:opacity-100" : "bg-pt-surface"
                }`}
            >
                <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold text-pt-text truncate group-hover:text-pt-accent transition-colors">
                                {ticket.title}
                            </h3>
                            <PriorityBadge priority={ticket.priority} className="shrink-0" />
                        </div>
                        <p className="text-xs text-pt-text-dim line-clamp-1">{ticket.description}</p>
                        <div className="flex items-center gap-2 pt-1 border-t border-pt-border/30">
                            <StatusBadge status={ticket.status} />
                            <span className="text-[10px] text-pt-text-muted">
                                {ticket.technician ? `· ${ticket.technician.name}` : "· Unassigned"}
                            </span>
                            <span className="ml-auto text-[10px] text-pt-text-muted font-medium">
                                {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                            </span>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-pt-text-muted group-hover:text-pt-accent shrink-0" />
                </CardContent>
            </Card>
        </Link>
    );
}
