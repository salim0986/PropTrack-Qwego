"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<string, string> = {
    CREATED: "📝", ASSIGNED: "👤", MISMATCH_ASSIGNED: "⚠️", ON_THE_WAY: "🚗",
    STATUS_CHANGED: "🔄", BLOCKED: "⛔", UNBLOCKED: "▶️", COMPLETION_SUBMITTED: "✅",
    REOPENED: "🔁", CLOSED_DUPLICATE: "🔗", RATED: "⭐",
};

export function TenantTicketDetailClient({ ticket }: { ticket: any }) {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [rated, setRated] = useState(!!ticket.rating);

    async function submitRating() {
        if (!rating) { toast.error("Select a rating"); return; }
        setSubmittingRating(true);
        try {
            const res = await fetch(`/api/tickets/${ticket.id}/rate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rating, comment }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            setRated(true);
            toast.success("Thank you for your feedback!");
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setSubmittingRating(false);
        }
    }

    return (
        <div className="flex flex-col gap-4 p-4 pb-28">
            <div className="flex items-center gap-3 pt-1">
                <Link href="/tenant/dashboard">
                    <button className="w-9 h-9 rounded-xl bg-pt-surface-light border border-pt-border flex items-center justify-center">
                        <ChevronLeft className="w-4 h-4 text-pt-text" />
                    </button>
                </Link>
                <div className="flex-1 min-w-0">
                    <p className="text-pt-text-dim text-xs">Ticket #{ticket.id.slice(0, 8)}</p>
                    <h1 className="text-xl font-bold text-pt-text tracking-tight truncate">{ticket.title}</h1>
                </div>
            </div>

            {/* Status + Priority Row */}
            <div className="flex items-center gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
            </div>

            {/* Main Info Card */}
            <div className="bg-pt-surface border border-pt-border rounded-2xl p-4 space-y-3">
                <div>
                    <p className="text-xs text-pt-text-muted mb-1">Description</p>
                    <p className="text-sm text-pt-text leading-relaxed">{ticket.description}</p>
                </div>
                <div className="h-px bg-pt-border" />
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-xs text-pt-text-muted">Category</p>
                        <p className="text-sm font-medium text-pt-text">{ticket.category}</p>
                    </div>
                    <div>
                        <p className="text-xs text-pt-text-muted">Building</p>
                        <p className="text-sm font-medium text-pt-text">{ticket.building?.name}</p>
                    </div>
                    <div>
                        <p className="text-xs text-pt-text-muted">Submitted</p>
                        <p className="text-sm font-medium text-pt-text">
                            {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                    {ticket.technician && (
                        <div>
                            <p className="text-xs text-pt-text-muted">Assigned to</p>
                            <p className="text-sm font-medium text-pt-text">{ticket.technician.name}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resolution Photos */}
            {ticket.images?.some((i: any) => i.type === "RESOLUTION") && (
                <div className="bg-pt-surface border border-pt-border rounded-2xl p-4">
                    <p className="text-xs text-pt-text-muted mb-3">Resolution Photos</p>
                    <div className="flex gap-2 flex-wrap">
                        {ticket.images
                            .filter((i: any) => i.type === "RESOLUTION")
                            .map((img: any, idx: number) => (
                                <img
                                    key={idx}
                                    src={img.url}
                                    alt="Resolution"
                                    className="w-24 h-24 object-cover rounded-xl border border-pt-border"
                                />
                            ))}
                    </div>
                    {ticket.resolutionNotes && (
                        <p className="text-sm text-pt-text mt-3 bg-pt-green/5 border border-pt-green/20 rounded-xl p-3 leading-relaxed">
                            {ticket.resolutionNotes}
                        </p>
                    )}
                </div>
            )}

            {/* Rating Section — shown only when DONE, not yet rated */}
            {ticket.status === "DONE" && !rated && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-pt-accent/10 border border-pt-accent/30 rounded-2xl p-4"
                >
                    <p className="text-sm font-semibold text-pt-text mb-1">How was the service?</p>
                    <p className="text-xs text-pt-text-muted mb-3">Rate your experience to help improve future service.</p>
                    <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                onClick={() => setRating(star)}
                                className="transition-transform hover:scale-110"
                            >
                                <Star
                                    className={cn(
                                        "w-7 h-7",
                                        star <= (hoveredRating || rating)
                                            ? "text-pt-yellow fill-pt-yellow"
                                            : "text-pt-border"
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                    <textarea
                        className="w-full bg-pt-surface-light border border-pt-border/50 rounded-xl p-3 text-sm text-pt-text resize-none h-16 focus:outline-none focus:ring-1 focus:ring-pt-accent mb-3"
                        placeholder="Optional: any comments for the manager..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                    <Button
                        onClick={submitRating}
                        disabled={!rating || submittingRating}
                        className="w-full h-10 bg-pt-accent hover:bg-pt-accent/90 text-white text-sm"
                    >
                        {submittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Rating"}
                    </Button>
                </motion.div>
            )}

            {rated && ticket.status === "DONE" && (
                <div className="bg-pt-green/10 border border-pt-green/30 rounded-xl p-3 text-center">
                    <p className="text-sm text-pt-green font-medium">✅ Thank you for your rating!</p>
                </div>
            )}

            {/* Activity Timeline */}
            {ticket.activityLogs?.length > 0 && (
                <div className="bg-pt-surface border border-pt-border rounded-2xl p-4">
                    <p className="text-xs text-pt-text-muted mb-3 font-semibold uppercase tracking-wider">Timeline</p>
                    <div className="space-y-3">
                        {ticket.activityLogs.map((log: any, idx: number) => (
                            <div key={idx} className="flex gap-3 items-start">
                                <span className="text-sm mt-0.5">{ACTION_ICONS[log.action] ?? "📌"}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-pt-text font-medium">{log.action.replace(/_/g, " ")}</p>
                                    {log.message && (
                                        <p className="text-xs text-pt-text-muted mt-0.5">{log.message}</p>
                                    )}
                                    <p className="text-[11px] text-pt-text-muted/60 mt-0.5">
                                        {log.actor?.name} · {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
