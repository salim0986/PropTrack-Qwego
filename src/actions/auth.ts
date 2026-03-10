"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
    try {
        await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirect: false,
        });
        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials. Please try again." };
                default:
                    return { error: error.message || "Something went wrong." };
            }
        }
        throw error;
    }
}
