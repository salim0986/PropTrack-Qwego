import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockInsert, mockValues, mockFindFirst } = vi.hoisted(() => {
    const mockValues = vi.fn(() => Promise.resolve());
    const mockInsert = vi.fn(() => ({ values: mockValues }));
    const mockFindFirst = vi.fn();
    return { mockInsert, mockValues, mockFindFirst };
});

vi.mock("@/db", () => ({
    db: {
        insert: mockInsert,
        query: { usersTable: { findFirst: mockFindFirst } },
    },
}));

// env vars must be set before imports
process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";

// Mock fetch globally (used for Telegram and Discord calls)
const mockFetch = vi.fn(() => Promise.resolve({ ok: true } as Response));
global.fetch = mockFetch;

vi.spyOn(console, "error").mockImplementation(() => {});

import { sendNotification } from "@/lib/notify";

// ── Helpers ────────────────────────────────────────────────────────────────
const basePayload = {
    userId: "user-1",
    ticketId: "ticket-1",
    title: "Test Notification",
    message: "Something happened to your ticket",
    type: "STATUS_CHANGED" as const,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("sendNotification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFetch.mockResolvedValue({ ok: true } as Response);
    });

    it("always inserts an in-app notification into the DB", async () => {
        mockFindFirst.mockResolvedValue({ telegramChatId: null, discordWebhook: null });
        await sendNotification(basePayload);
        expect(mockInsert).toHaveBeenCalledOnce();
        expect(mockValues).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "user-1",
                title: "Test Notification",
                type: "STATUS_CHANGED",
            })
        );
    });

    it("does NOT call fetch when user has no telegram or discord", async () => {
        mockFindFirst.mockResolvedValue({ telegramChatId: null, discordWebhook: null });
        await sendNotification(basePayload);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls Telegram API when user has telegramChatId", async () => {
        mockFindFirst.mockResolvedValue({ telegramChatId: "123456789", discordWebhook: null });
        await sendNotification(basePayload);
        await new Promise((r) => setTimeout(r, 20));
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("api.telegram.org"),
            expect.objectContaining({ method: "POST" })
        );
    });

    it("calls Discord webhook when user has discordWebhook", async () => {
        mockFindFirst.mockResolvedValue({ telegramChatId: null, discordWebhook: "https://discord.com/api/webhooks/123/abc" });
        await sendNotification(basePayload);
        await new Promise((r) => setTimeout(r, 20));
        expect(mockFetch).toHaveBeenCalledWith(
            "https://discord.com/api/webhooks/123/abc",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("inserts notification without ticketId when ticketId is omitted", async () => {
        mockFindFirst.mockResolvedValue({ telegramChatId: null, discordWebhook: null });
        const noTicketPayload = { ...basePayload };
        delete (noTicketPayload as any).ticketId;
        await sendNotification(noTicketPayload);
        expect(mockInsert).toHaveBeenCalledOnce();
    });

    it("gracefully handles user not found (no external calls)", async () => {
        mockFindFirst.mockResolvedValue(null);
        await sendNotification(basePayload);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls both Telegram and Discord when both are configured", async () => {
        mockFindFirst.mockResolvedValue({ telegramChatId: "789", discordWebhook: "https://discord.com/api/webhooks/999/xyz" });
        await sendNotification(basePayload);
        await new Promise((r) => setTimeout(r, 20));
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});
