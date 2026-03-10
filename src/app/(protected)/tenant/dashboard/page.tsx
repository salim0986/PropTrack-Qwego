import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ticketsTable } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Plus, Ticket, MessageSquare } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default async function TenantDashboard() {
    const session = await auth();
    if (!session?.user) return null;

    const tickets = await db.query.ticketsTable.findMany({
        where: eq(ticketsTable.tenantId, session.user.id!),
        orderBy: [desc(ticketsTable.createdAt)],
        with: {
            building: true,
        },
    });

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Welcome & CTA */}
            <section className="space-y-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-pt-text">
                        Hello, {session.user.name?.split(" ")[0]}
                    </h1>
                    <p className="text-pt-text-dim text-sm">
                        Need help with something in your unit?
                    </p>
                </div>

                <Link href="/tenant/tickets/new">
                    <Button className="w-full h-14 bg-pt-accent hover:bg-pt-accent/90 text-white rounded-xl shadow-lg shadow-pt-accent/20 flex items-center justify-between px-6 group">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="font-semibold text-base">Report New Issue</span>
                        </div>
                        <ArrowRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Link>
            </section>

            {/* Stats / Active Count */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
                <div className="bg-pt-surface-light border border-pt-border/50 rounded-xl p-3 min-w-[140px] flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-pt-text-muted font-bold">Active Tickets</p>
                    <p className="text-2xl font-bold text-pt-text mt-1">
                        {tickets.filter(t => t.status !== "DONE" && t.status !== "CLOSED_DUPLICATE").length}
                    </p>
                </div>
                <div className="bg-pt-surface-light border border-pt-border/50 rounded-xl p-3 min-w-[140px] flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-pt-text-muted font-bold">Building</p>
                    <p className="text-sm font-semibold text-pt-text mt-1 truncate">
                        {tickets[0]?.building?.name || "PropTrack Demo"}
                    </p>
                </div>
            </div>

            {/* Ticket List */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-pt-text">Recent Requests</h2>
                    <Button variant="link" className="text-pt-accent p-0 h-auto text-xs font-semibold">
                        View All
                    </Button>
                </div>

                {tickets.length === 0 ? (
                    <Card className="border-dashed border-pt-border bg-transparent py-10">
                        <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
                            <div className="bg-pt-surface-light p-4 rounded-full">
                                <Ticket className="w-8 h-8 text-pt-text-muted" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-pt-text font-medium">No tickets yet</p>
                                <p className="text-pt-text-dim text-xs max-w-[200px]">
                                    When you report an issue, it will appear here.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {tickets.map((ticket) => (
                            <Link key={ticket.id} href={`/tenant/tickets/${ticket.id}`}>
                                <Card className="bg-pt-surface border-pt-border/60 hover:border-pt-accent/40 hover:shadow-md transition-all active:scale-[0.98] group overflow-hidden">
                                    <CardContent className="p-4 flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1 min-w-0">
                                                <h3 className="font-semibold text-pt-text truncate group-hover:text-pt-accent transition-colors">
                                                    {ticket.title}
                                                </h3>
                                                <p className="text-xs text-pt-text-dim line-clamp-1">
                                                    {ticket.description}
                                                </p>
                                            </div>
                                            <PriorityBadge priority={ticket.priority} className="shrink-0" />
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-pt-border/30 mt-1">
                                            <StatusBadge status={ticket.status} />
                                            <div className="flex items-center gap-1.5 text-[10px] text-pt-text-muted font-medium">
                                                <span className="w-1 h-1 rounded-full bg-pt-border"></span>
                                                {formatDistanceToNow(new Date(ticket.createdAt))} ago
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function ArrowRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    );
}
