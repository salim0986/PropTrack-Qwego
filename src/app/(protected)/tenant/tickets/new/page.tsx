"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Camera,
    ChevronRight,
    ChevronLeft,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    X,
    Plus
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AfterHoursBanner } from "@/components/shared/AfterHoursBanner";
import { isAfterHours as checkAfterHours } from "@/lib/after-hours";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    { value: "PLUMBING", label: "Plumbing", description: "Leaks, toilets, faucets" },
    { value: "ELECTRICAL", label: "Electrical", description: "Outlets, lights, breakers" },
    { value: "HVAC", label: "Heating & Cooling", description: "AC, heater, ventilation" },
    { value: "STRUCTURAL", label: "Structural", description: "Walls, ceiling, windows" },
    { value: "OTHER", label: "Other", description: "General maintenance" },
];

export default function NewTicketPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [afterHours] = useState(() => checkAfterHours());
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        priority: "MEDIUM",
    });

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (images.length + files.length > 3) {
                toast.error("Maximum 3 images allowed");
                return;
            }
            setImages(prev => [...prev, ...files]);
            const urls = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...urls]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.title || !formData.description || !formData.category) {
                toast.error("Please fill in all required fields");
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 1. Upload Images to Supabase if any
            const uploadedUrls: string[] = [];
            if (images.length > 0) {
                const supabase = createClient();
                for (const file of images) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const filePath = `tickets/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('ticket-images')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('ticket-images')
                        .getPublicUrl(filePath);

                    uploadedUrls.push(publicUrl);
                }
            }

            // 2. Submit Ticket via Server Action
            // (We will implement this action in the next step)
            const response = await fetch("/api/tickets", {
                method: "POST",
                body: JSON.stringify({ ...formData, imageUrls: uploadedUrls }),
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || "Failed to submit ticket");
            }

            toast.success("Ticket submitted successfully!", {
                description: "A technician will be assigned soon.",
            });
            router.push("/tenant/dashboard");
            router.refresh();

        } catch (error: any) {
            toast.error("Submission failed", {
                description: error.message || "Something went wrong. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto space-y-6 pb-10">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => step === 1 ? router.back() : prevStep()}
                    className="rounded-full bg-pt-surface-light border border-pt-border/50"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-xl font-bold text-pt-text">Report Issue</h1>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-2">
                <div className={cn("h-1.5 flex-1 rounded-full bg-pt-accent transition-all duration-500", step === 2 ? "opacity-100" : "opacity-30")} />
                <div className={cn("h-1.5 flex-1 rounded-full bg-pt-accent transition-all duration-500", step === 2 ? "opacity-100" : "opacity-30")} />
            </div>

            <AfterHoursBanner isAfterHours={afterHours} />

            <AnimatePresence mode="wait">
                {step === 1 ? (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-pt-text-muted">Issue Category</Label>
                                <div className="grid grid-cols-1 gap-2">
                                    {CATEGORIES.map((cat) => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-xl border text-left transition-all active:scale-[0.98]",
                                                formData.category === cat.value
                                                    ? "bg-pt-accent/10 border-pt-accent text-pt-accent shadow-sm ring-1 ring-pt-accent"
                                                    : "bg-pt-surface border-pt-border/60 text-pt-text-dim hover:border-pt-accent/40"
                                            )}
                                        >
                                            <div>
                                                <p className="font-semibold text-sm">{cat.label}</p>
                                                <p className="text-[10px] opacity-70 mt-0.5">{cat.description}</p>
                                            </div>
                                            {formData.category === cat.value && <CheckCircle2 className="w-5 h-5" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-pt-text-muted">Quick Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Kitchen sink leaking"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="h-12 bg-pt-surface border-pt-border/60 rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-pt-text-muted">Details</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Explain the problem in detail..."
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="bg-pt-surface border-pt-border/60 rounded-xl resize-none"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={nextStep}
                            className="w-full h-14 bg-pt-accent hover:bg-pt-accent/90 text-white rounded-xl shadow-lg shadow-pt-accent/20 font-bold"
                        >
                            Continue
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-4">
                            <div className="bg-pt-surface-light border border-pt-border/50 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-pt-accent/10 rounded-full flex items-center justify-center">
                                    <Camera className="w-8 h-8 text-pt-accent" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-pt-text text-lg">Add Photos</h3>
                                    <p className="text-sm text-pt-text-dim max-w-[200px]">
                                        Visuals help our technicians arrive prepared with the right tools.
                                    </p>
                                </div>

                                <input
                                    type="file"
                                    id="images"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <Label
                                    htmlFor="images"
                                    className="cursor-pointer border border-pt-accent text-pt-accent hover:bg-pt-accent/5 rounded-xl px-6 py-2 h-10 inline-flex items-center justify-center text-sm font-medium transition-colors"
                                >
                                    Capture or Upload
                                </Label>
                            </div>

                            {previewUrls.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {previewUrls.map((url, i) => (
                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-pt-border">
                                            <img src={url} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeImage(i)}
                                                className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full active:scale-90"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {previewUrls.length < 3 && (
                                        <label
                                            htmlFor="images"
                                            className="border-2 border-dashed border-pt-border rounded-xl flex items-center justify-center cursor-pointer hover:border-pt-accent transition-colors"
                                        >
                                            <Plus className="w-6 h-6 text-pt-text-muted" />
                                        </label>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-pt-text-muted">Priority</Label>
                                <div className="flex gap-2">
                                    {["LOW", "MEDIUM", "HIGH"].map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl border text-xs font-bold transition-all",
                                                formData.priority === p
                                                    ? "bg-pt-accent text-white border-pt-accent"
                                                    : "bg-pt-surface border-pt-border/60 text-pt-text-dim"
                                            )}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-full h-14 bg-pt-accent hover:bg-pt-accent/90 text-white rounded-xl shadow-lg shadow-pt-accent/20 font-bold"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Submit Report"
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={prevStep}
                                disabled={loading}
                                className="w-full h-11 text-pt-text-muted"
                            >
                                Go Back
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


