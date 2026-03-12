import { describe, it, expect } from "vitest";
import {
    ticketSchema,
    completeTicketSchema,
    registerSchema,
    reopenTicketSchema,
    unblockTicketSchema,
    rateTicketSchema,
} from "@/lib/validations";

describe("ticketSchema", () => {
    const valid = {
        title: "This is a valid title",
        description: "This is a valid description",
        category: "PLUMBING",
        priority: "MEDIUM",
    };

    it("passes with valid input", () => {
        expect(() => ticketSchema.parse(valid)).not.toThrow();
    });

    it("fails when title is too short", () => {
        expect(() => ticketSchema.parse({ ...valid, title: "Leak" })).toThrow("at least 5");
    });

    it("fails when description is too short", () => {
        expect(() => ticketSchema.parse({ ...valid, description: "small" })).toThrow("at least 10");
    });

    it("fails with invalid category", () => {
        expect(() => ticketSchema.parse({ ...valid, category: "ROOFING" })).toThrow();
    });

    it("allows up to 3 imageUrls", () => {
        expect(() =>
            ticketSchema.parse({
                ...valid,
                imageUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg", "https://example.com/c.jpg"],
            })
        ).not.toThrow();
    });

    it("fails with more than 3 imageUrls", () => {
        expect(() =>
            ticketSchema.parse({
                ...valid,
                imageUrls: [
                    "https://example.com/a.jpg",
                    "https://example.com/b.jpg",
                    "https://example.com/c.jpg",
                    "https://example.com/d.jpg",
                ],
            })
        ).toThrow("Maximum of 3");
    });
});

describe("completeTicketSchema", () => {
    const valid = {
        resolutionNotes: "This is a long enough resolution note explaining what was done to fix the issue.",
        imageUrls: ["https://example.com/proof.jpg"],
    };

    it("passes with valid proof", () => {
        expect(() => completeTicketSchema.parse(valid)).not.toThrow();
    });

    it("fails when resolutionNotes is too short", () => {
        expect(() =>
            completeTicketSchema.parse({ ...valid, resolutionNotes: "Too short" })
        ).toThrow("20 characters");
    });

    it("fails with 0 images (empty array)", () => {
        expect(() =>
            completeTicketSchema.parse({ ...valid, imageUrls: [] })
        ).toThrow("At least 1");
    });

    it("fails with more than 3 resolution images", () => {
        expect(() =>
            completeTicketSchema.parse({
                ...valid,
                imageUrls: [
                    "https://example.com/a.jpg",
                    "https://example.com/b.jpg",
                    "https://example.com/c.jpg",
                    "https://example.com/d.jpg",
                ],
            })
        ).toThrow("Maximum of 3");
    });

    it("fails when imageUrl is not a valid URL", () => {
        expect(() =>
            completeTicketSchema.parse({ ...valid, imageUrls: ["not-a-url"] })
        ).toThrow();
    });
});

describe("registerSchema", () => {
    it("passes for tenant registration", () => {
        expect(() =>
            registerSchema.parse({
                name: "Sarah Mitchell",
                email: "sarah@example.com",
                password: "securepassword123",
                role: "TENANT",
                buildingId: "building-uuid",
                unitNumber: "4B",
            })
        ).not.toThrow();
    });

    it("passes for technician registration", () => {
        expect(() =>
            registerSchema.parse({
                name: "Carlos Rodriguez",
                email: "carlos@example.com",
                password: "securepassword123",
                role: "TECHNICIAN",
                specialties: ["PLUMBING", "HVAC"],
            })
        ).not.toThrow();
    });

    it("allows manager in schema (blocked at API level, not validation layer)", () => {
        // The API route hard-blocks manager — but Zod schema itself allows the enum value
        expect(() =>
            registerSchema.parse({
                name: "Admin",
                email: "admin@example.com",
                password: "securepassword123",
                role: "MANAGER",
            })
        ).not.toThrow(); // API blocks this, not Zod
    });

    it("fails with short password", () => {
        expect(() =>
            registerSchema.parse({
                name: "Test",
                email: "test@test.com",
                password: "short",
                role: "TENANT",
            })
        ).toThrow("8 characters");
    });

    it("fails with invalid email", () => {
        expect(() =>
            registerSchema.parse({
                name: "Test User",
                email: "not-an-email",
                password: "validpassword123",
                role: "TENANT",
            })
        ).toThrow();
    });
});

describe("reopenTicketSchema", () => {
    it("passes with sufficient reason", () => {
        expect(() =>
            reopenTicketSchema.parse({ reason: "Issue persists after reported fix, faucet still dripping" })
        ).not.toThrow();
    });

    it("fails with short reason", () => {
        expect(() => reopenTicketSchema.parse({ reason: "Short" })).toThrow();
    });
});

describe("unblockTicketSchema", () => {
    it("passes with sufficient note", () => {
        expect(() =>
            unblockTicketSchema.parse({ unblockNote: "Parts have arrived and work can now resume" })
        ).not.toThrow();
    });

    it("fails with short note", () => {
        expect(() => unblockTicketSchema.parse({ unblockNote: "Got parts" })).toThrow();
    });
});

describe("rateTicketSchema", () => {
    it("passes valid 5-star rating", () => {
        expect(() => rateTicketSchema.parse({ rating: 5 })).not.toThrow();
    });

    it("fails rating = 0", () => {
        expect(() => rateTicketSchema.parse({ rating: 0 })).toThrow("at least 1");
    });

    it("fails rating = 6", () => {
        expect(() => rateTicketSchema.parse({ rating: 6 })).toThrow("cannot exceed 5");
    });

    it("fails non-integer rating", () => {
        expect(() => rateTicketSchema.parse({ rating: 3.5 })).toThrow();
    });

    it("passes with optional comment", () => {
        expect(() => rateTicketSchema.parse({ rating: 4, comment: "Good service!" })).not.toThrow();
    });
});
