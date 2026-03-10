"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Building, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        const res = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (res?.error) {
            toast.error(res.error, {
                description: "Please check your email and password.",
            });
            setLoading(false);
        } else {
            toast.success("Welcome back!", {
                description: "Redirecting to your dashboard...",
            });
            // Force hard navigation to reset app state safely and allow layout gatekeeping
            router.push("/");
            router.refresh();
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-pt-bg p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-sm"
            >
                <div className="bg-pt-surface shadow-2xl rounded-2xl border border-pt-border/60 p-6 sm:p-8 flex flex-col items-center">
                    <div className="w-12 h-12 bg-pt-accent/10 rounded-xl flex items-center justify-center mb-6">
                        <Building className="w-6 h-6 text-pt-accent" />
                    </div>

                    <div className="text-center space-y-1.5 mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-pt-text">Welcome back</h1>
                        <p className="text-sm text-pt-text-dim">Enter your credentials to continue to PropTrack.</p>
                    </div>

                    <form onSubmit={handleLogin} className="w-full space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-pt-text-muted">Email address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                autoComplete="email"
                                className="bg-pt-surface-light border-pt-border/50 focus-visible:ring-pt-accent h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-pt-text-muted">Password</Label>
                                <a href="#" className="text-xs text-pt-accent hover:underline font-medium">
                                    Forgot password?
                                </a>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                autoComplete="current-password"
                                className="bg-pt-surface-light border-pt-border/50 focus-visible:ring-pt-accent h-11"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-pt-accent hover:bg-pt-accent/90 text-white font-medium shadow-md shadow-pt-accent/20 transition-all mt-6"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm text-pt-text-muted">
                        Don&apos;t have an account?{" "}
                        <a href="#" className="text-pt-accent font-medium hover:underline">
                            Request access
                        </a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
