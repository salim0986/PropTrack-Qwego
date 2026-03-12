import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFindFirstReg } = vi.hoisted(() => ({
    mockFindFirstReg: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendNotification: vi.fn(() => Promise.resolve()) }));
vi.mock("@/db", () => ({
    db: {
        query: { registrationRequestsTable: { findFirst: mockFindFirstReg } },
        transaction: vi.fn(async (cb: any) => cb({
            update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
        })),
    },
}));

import { PATCH } from "@/app/api/registrations/[id]/route";
import { auth } from "@/lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────────
const managerSession = { user: { id: "mgr-1", role: "MANAGER" } };
const tenantSession = { user: { id: "ten-1", role: "TENANT" } };
const makeParams = () => Promise.resolve({ id: "reg-1" });
const makeRequest = (body: object) =>
    new Request("http://localhost/api/registrations/reg-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

const pendingReg = {
    id: "reg-1", status: "PENDING", userId: "tech-1",
    user: { id: "tech-1", name: "Bob Tech", email: "bob@tech.com" },
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("PATCH /api/registrations/[id]", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when unauthenticated", async () => {
        (auth as any).mockResolvedValue(null);
        const res = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
        expect(res.status).toBe(401);
    });

    it("returns 401 when role is TENANT", async () => {
        (auth as any).mockResolvedValue(tenantSession);
        const res = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
        expect(res.status).toBe(401);
    });

    it("returns 404 when registration not found", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstReg.mockResolvedValue(null);
        const res = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
        expect(res.status).toBe(404);
    });

    it("returns 409 when registration already reviewed", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstReg.mockResolvedValue({ ...pendingReg, status: "APPROVED" });
        const res = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
        expect(res.status).toBe(409);
    });

    it("returns 200 and action=approve for APPROVE", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstReg.mockResolvedValue(pendingReg);
        const res = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
        expect(res.status).toBe(200);
        expect((await res.json()).action).toBe("approve");
    });

    it("returns 400 for REJECT without reason", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstReg.mockResolvedValue(pendingReg);
        const res = await PATCH(makeRequest({ action: "reject" }), { params: makeParams() });
        expect(res.status).toBe(400);
    });

    it("returns 200 and action=reject for REJECT with reason", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstReg.mockResolvedValue(pendingReg);
        const res = await PATCH(makeRequest({ action: "reject", reason: "Not qualified" }), { params: makeParams() });
        expect(res.status).toBe(200);
        expect((await res.json()).action).toBe("reject");
    });

    it("returns 400 for invalid action", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstReg.mockResolvedValue(pendingReg);
        const res = await PATCH(makeRequest({ action: "suspend" }), { params: makeParams() });
        expect(res.status).toBe(400);
    });
});
