import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFindFirstTicket } = vi.hoisted(() => ({
    mockFindFirstTicket: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendNotification: vi.fn(() => Promise.resolve()) }));
vi.mock("@/db", () => ({
    db: {
        query: { ticketsTable: { findFirst: mockFindFirstTicket } },
        transaction: vi.fn(async (cb: any) => cb({
            insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
        })),
    },
}));

import { POST } from "@/app/api/tickets/[id]/rate/route";
import { auth } from "@/lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────────
const makeSession = (role: string, id = "ten-1") => ({ user: { id, role } });
const makeParams = () => Promise.resolve({ id: "ticket-1" });
const makeRequest = (body: object) =>
    new Request("http://localhost/api/tickets/ticket-1/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const doneTicket = {
    id: "ticket-1", status: "DONE", tenantId: "ten-1",
    building: { managerId: "mgr-1" },
    technician: { id: "tech-1", name: "Bob" },
    rating: null,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/tickets/[id]/rate", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when unauthenticated", async () => {
        (auth as any).mockResolvedValue(null);
        const res = await POST(makeRequest({ rating: 5 }), { params: makeParams() });
        expect(res.status).toBe(401);
    });

    it("returns 403 when role is MANAGER", async () => {
        (auth as any).mockResolvedValue(makeSession("MANAGER", "mgr-1"));
        const res = await POST(makeRequest({ rating: 4 }), { params: makeParams() });
        expect(res.status).toBe(403);
    });

    it("returns 403 when role is TECHNICIAN", async () => {
        (auth as any).mockResolvedValue(makeSession("TECHNICIAN", "tech-1"));
        const res = await POST(makeRequest({ rating: 4 }), { params: makeParams() });
        expect(res.status).toBe(403);
    });

    it("returns 404 when ticket not found", async () => {
        (auth as any).mockResolvedValue(makeSession("TENANT"));
        mockFindFirstTicket.mockResolvedValue(null);
        const res = await POST(makeRequest({ rating: 5 }), { params: makeParams() });
        expect(res.status).toBe(404);
    });

    it("returns 403 when tenant doesn't own the ticket", async () => {
        (auth as any).mockResolvedValue(makeSession("TENANT", "other-tenant"));
        mockFindFirstTicket.mockResolvedValue(doneTicket);
        const res = await POST(makeRequest({ rating: 4 }), { params: makeParams() });
        expect(res.status).toBe(403);
    });

    it("returns 400 when ticket is not DONE", async () => {
        (auth as any).mockResolvedValue(makeSession("TENANT", "ten-1"));
        mockFindFirstTicket.mockResolvedValue({ ...doneTicket, status: "IN_PROGRESS" });
        const res = await POST(makeRequest({ rating: 5 }), { params: makeParams() });
        expect(res.status).toBe(400);
    });

    it("returns 409 when ticket already rated", async () => {
        (auth as any).mockResolvedValue(makeSession("TENANT", "ten-1"));
        mockFindFirstTicket.mockResolvedValue({ ...doneTicket, rating: { rating: 4 } });
        const res = await POST(makeRequest({ rating: 5 }), { params: makeParams() });
        expect(res.status).toBe(409);
    });

    it("returns 200 for valid first-time rating with comment", async () => {
        (auth as any).mockResolvedValue(makeSession("TENANT", "ten-1"));
        mockFindFirstTicket.mockResolvedValue(doneTicket);
        const res = await POST(makeRequest({ rating: 5, comment: "Great job!" }), { params: makeParams() });
        expect(res.status).toBe(200);
    });

    it("returns 400 for rating > 5", async () => {
        (auth as any).mockResolvedValue(makeSession("TENANT", "ten-1"));
        mockFindFirstTicket.mockResolvedValue(doneTicket);
        const res = await POST(makeRequest({ rating: 6 }), { params: makeParams() });
        expect(res.status).toBe(400);
    });

    it("returns 400 for rating 0", async () => {
        (auth as any).mockResolvedValue(makeSession("TENANT", "ten-1"));
        mockFindFirstTicket.mockResolvedValue(doneTicket);
        const res = await POST(makeRequest({ rating: 0 }), { params: makeParams() });
        expect(res.status).toBe(400);
    });
});
