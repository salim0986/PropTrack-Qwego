import { z } from "zod";

export const ticketSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(100),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.enum(["PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL", "OTHER"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    imageUrls: z.array(z.string().url()).max(3, "Maximum of 3 images allowed").optional(),
});

export const blockTicketSchema = z.object({
    reason: z.string().min(5, "Please provide a reason for blocking the ticket"),
});

export const completeTicketSchema = z.object({
    resolutionNotes: z.string().min(20, "Resolution notes must be detailed (min 20 characters)"),
    imageUrl: z.string().url("A photo proving completion is strictly required"),
});

export const registerSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["TENANT", "MANAGER", "TECHNICIAN"]),
    buildingId: z.string().optional(),
    unitNumber: z.string().optional(),
});
