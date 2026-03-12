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

// Completion proof: server enforces min 1 photo, max 3 photos + 20-char note
export const completeTicketSchema = z.object({
    resolutionNotes: z.string().min(20, "Resolution notes must be detailed (min 20 characters)"),
    imageUrls: z
        .array(z.string().url("Each image must be a valid URL"))
        .min(1, "At least 1 resolution photo is required")
        .max(3, "Maximum of 3 resolution photos allowed"),
});

export const registerSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["TENANT", "MANAGER", "TECHNICIAN"]),
    buildingId: z.string().optional(),
    unitNumber: z.string().optional(),
    specialties: z
        .array(z.enum(["PLUMBING", "ELECTRICAL", "HVAC", "STRUCTURAL", "GENERAL"]))
        .optional(),
});

// Reopen requires a mandatory reason
export const reopenTicketSchema = z.object({
    reason: z.string().min(10, "Please provide a detailed reason for reopening this ticket"),
});

// Unblock requires a mandatory note about what changed
export const unblockTicketSchema = z.object({
    unblockNote: z.string().min(10, "Please describe what changed and how the block was resolved"),
});

// Rate ticket: 1-5 stars + optional comment
export const rateTicketSchema = z.object({
    rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
    comment: z.string().max(500).optional(),
});
