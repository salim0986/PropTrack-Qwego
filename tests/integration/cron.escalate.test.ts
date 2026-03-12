import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("@/lib/notify", () => ({ sendNotification: vi.fn(() => Promise.resolve()) }));

process.env.CRON_SECRET = "test-secret-123";

const mockFindManyStalled = vi.fn();
const mockFindManyUrgent = vi.fn();

let callCount = 0;
vi.mock("@/db", () => ({
    db: {
        query: {
            ticketsTable: {
                findMany: vi.fn((...args: any[]) => {
                    callCount++;
                    if (callCount % 2 === 1) return mockFindManyStalled(...args);
                    return mockFindManyUrgent(...args);
                }),
            },
        },
    },
}));

import { GET } from "@/app/api/cron/escalate/route";
import { sendNotification } from "@/lib/notify";

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(secret?: string) {
    const headers: HeadersInit = secret ? { authorization: `Bearer ${secret}` } : {};
    return new Request("http://localhost/api/cron/escalate", { headers });
}

const stalledTicket = {
    id: "ticket-1",
    title: "Dripping tap",
    status: "ASSIGNED",
    priority: "MEDIUM",
    technicianId: "tech-1",
    updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    building: { managerId: "mgr-1", name: "Tower A" },
    tenant: { name: "Alice" },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/cron/escalate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        callCount = 0;
        mockFindManyStalled.mockResolvedValue([]);
        mockFindManyUrgent.mockResolvedValue([]);
    });

    it("returns 401 without authorization header", async () => {
        const res = await GET(makeRequest());
        expect(res.status).toBe(401);
    });

    it("returns 401 with wrong secret", async () => {
        const res = await GET(makeRequest("wrong-secret"));
        expect(res.status).toBe(401);
    });

    it("returns 200 with correct secret and no stalled tickets", async () => {
        const res = await GET(makeRequest("test-secret-123"));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.escalated).toBe(0);
        expect(json.urgentEscalated).toBe(0);
    });

    it("sends escalation notifications for stalled ASSIGNED tickets", async () => {
        mockFindManyStalled.mockResolvedValue([stalledTicket]);
        const res = await GET(makeRequest("test-secret-123"));
        expect(res.status).toBe(200);
        expect(sendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "mgr-1",
                ticketId: "ticket-1",
                type: "ESCALATION",
            })
        );
        const json = await res.json();
        expect(json.escalated).toBe(1);
    });

    it("sends urgent escalation for HIGH priority unassigned tickets", async () => {
        mockFindManyUrgent.mockResolvedValue([{
            id: "urgent-1",
            title: "Gas leak!",
            status: "OPEN",
            priority: "URGENT",
            updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            building: { managerId: "mgr-1", name: "Tower B" },
        }]);
        const res = await GET(makeRequest("test-secret-123"));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.urgentEscalated).toBe(1);
    });

    it("skips tickets without a managerId gracefully", async () => {
        mockFindManyStalled.mockResolvedValue([{ ...stalledTicket, building: { managerId: null, name: "Oak" } }]);
        const res = await GET(makeRequest("test-secret-123"));
        expect(res.status).toBe(200);
        expect(sendNotification).not.toHaveBeenCalled();
    });
});
