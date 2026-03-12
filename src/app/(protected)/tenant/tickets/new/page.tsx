"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChevronLeft, ImagePlus, Loader2, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AfterHoursBanner } from "@/components/shared/AfterHoursBanner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL", "OTHER"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const PRIORITY_COLORS: Record<string, string> = {
    LOW: "border-pt-green/30 bg-pt-green/5 text-pt-green",
    MEDIUM: "border-pt-yellow/30 bg-pt-yellow/5 text-pt-yellow",
    HIGH: "border-pt-red/30 bg-pt-red/5 text-pt-red",
    URGENT: "border-pt-red bg-pt-red/10 text-pt-red font-bold",
};

export default function NewTicketPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [category, setCategory] = useState<string>("");
    const [priority, setPriority] = useState<string>("MEDIUM");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrls, setImageUrls] = useState<string[]>([]);

    async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (imageUrls.length >= 3) { toast.error("Maximum 3 images"); return; }

        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/uploads", { method: "POST", body: formData });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            const { url } = await res.json();
            setImageUrls((prev) => [...prev, url]);
            toast.success("Photo attached");
        } catch (err: any) {
            toast.error(err.message || "Upload failed");
        } finally {
            setUploadingImage(false);
        }
    }

    async function handleSubmit() {
        if (!category || !title.trim() || description.trim().length < 10) {
            toast.error("Please fill out all required fields");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, category, priority, imageUrls }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success("Request submitted!", { description: "A manager will assign a technician shortly." });
            router.push("/tenant/dashboard");
        } catch (err: any) {
            toast.error(err.message || "Submission failed");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex flex-col gap-4 p-4 pb-28">
            <AfterHoursBanner />

            {/* Header */}
            <div className="flex items-center gap-3 pt-1">
                <button
                    onClick={() => step > 1 ? setStep(1) : router.back()}
                    className="w-9 h-9 rounded-xl bg-pt-surface-light border border-pt-border flex items-center justify-center"
                >
                    <ChevronLeft className="w-4 h-4 text-pt-text" />
                </button>
                <div>
                    <p className="text-pt-text-dim text-xs">Step {step} of 2</p>
                    <h1 className="text-xl font-bold text-pt-text tracking-tight">
                        {step === 1 ? "What's the issue?" : "Describe it"}
                    </h1>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex gap-1.5">
                {[1, 2].map((s) => (
                    <div key={s} className={cn(
                        "h-1 rounded-full flex-1 transition-all",
                        s <= step ? "bg-pt-accent" : "bg-pt-border"
                    )} />
                ))}
            </div>

            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col gap-4"
                    >
                        {/* Category */}
                        <div>
                            <Label className="text-pt-text-muted mb-2 block">Issue Category *</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {CATEGORIES.map((c) => (
                                    <button
                                        key={c}
                                        onClick={() => setCategory(c)}
                                        className={cn(
                                            "h-11 rounded-xl border text-sm font-medium transition-all",
                                            category === c
                                                ? "bg-pt-accent border-pt-accent text-white"
                                                : "bg-pt-surface-light border-pt-border text-pt-text-muted hover:text-pt-text"
                                        )}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <Label className="text-pt-text-muted mb-2 block">Priority</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {PRIORITIES.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPriority(p)}
                                        className={cn(
                                            "h-11 rounded-xl border text-sm font-medium transition-all",
                                            priority === p ? PRIORITY_COLORS[p] : "bg-pt-surface-light border-pt-border text-pt-text-muted"
                                        )}
                                    >
                                        {p === "URGENT" && "🔴 "}
                                        {p === "HIGH" && "🟠 "}
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {priority === "URGENT" && (
                            <div className="bg-pt-red/10 border border-pt-red/30 rounded-xl p-3 flex gap-2 items-start">
                                <AlertTriangle className="w-4 h-4 text-pt-red shrink-0 mt-0.5" />
                                <p className="text-xs text-pt-red">
                                    URGENT requests will be escalated immediately and may require emergency contact.
                                </p>
                            </div>
                        )}

                        <Button
                            className="h-11 bg-pt-accent hover:bg-pt-accent/90 text-white mt-2"
                            disabled={!category}
                            onClick={() => setStep(2)}
                        >
                            Next — Add Details
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col gap-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-pt-text-muted">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Kitchen faucet dripping constantly"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                maxLength={100}
                                className="bg-pt-surface-light border-pt-border/50 h-11 focus-visible:ring-pt-accent"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc" className="text-pt-text-muted">Description *</Label>
                            <textarea
                                id="desc"
                                className="w-full bg-pt-surface-light border border-pt-border/50 rounded-xl p-3 text-sm text-pt-text h-28 resize-none focus:outline-none focus:ring-1 focus:ring-pt-accent"
                                placeholder="Describe when it started, how severe it is..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                            <p className="text-xs text-pt-text-muted text-right">{description.length} / min 10 chars</p>
                        </div>

                        {/* Photo Attach */}
                        <div className="space-y-2">
                            <Label className="text-pt-text-muted">Photos (optional, max 3)</Label>
                            <div className="flex gap-2 flex-wrap">
                                {imageUrls.map((url, i) => (
                                    <div key={i} className="relative w-20 h-20">
                                        <img src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-pt-border" />
                                        <button
                                            onClick={() => setImageUrls((prev) => prev.filter((_, j) => j !== i))}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-pt-red rounded-full flex items-center justify-center"
                                        >
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ))}
                                {imageUrls.length < 3 && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingImage}
                                        className="w-20 h-20 rounded-xl border-2 border-dashed border-pt-border flex items-center justify-center bg-pt-surface-light hover:border-pt-accent/50 transition-colors"
                                    >
                                        {uploadingImage ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-pt-text-muted" />
                                        ) : (
                                            <ImagePlus className="w-5 h-5 text-pt-text-muted" />
                                        )}
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="hidden"
                                    onChange={uploadPhoto}
                                />
                            </div>
                        </div>

                        <Button
                            className="h-11 bg-pt-accent hover:bg-pt-accent/90 text-white mt-2"
                            disabled={submitting || !title.trim() || description.trim().length < 10}
                            onClick={handleSubmit}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Submit Request
                                </>
                            )}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
