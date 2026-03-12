import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFindFirstUser, mockFindFirstTicket } = vi.hoisted(() => ({
    mockFindFirstUser: vi.fn(),
    mockFindFirstTicket: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendNotification: vi.fn(() => Promise.resolve()) }));
vi.mock("@/db", () => ({
    db: {
        query: {
            ticketsTable: { findFirst: mockFindFirstTicket },
            usersTable: { findFirst: mockFindFirstUser },
        },
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
        transaction: vi.fn(async (cb: any) => {
            const mockTx = {
                update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
                insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) })),
            };
            return cb(mockTx);
        }),
    },
}));

import { PATCH } from "@/app/api/tickets/[id]/assign/route";
import { auth } from "@/lib/auth";

// ── Helpers ────────────────────────────────────────────────────────────────
const managerSession = { user: { id: "mgr-1", role: "MANAGER" } };
const tenantSession = { user: { id: "tenant-1", role: "TENANT" } };
const makeParams = (id = "ticket-1") => Promise.resolve({ id });
const makePatchRequest = (body: object) =>
    new Request("http://localhost/api/tickets/ticket-1/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

// Helpers for mocking
const activeTech = (specialties: string[]) => ({ id: "tech-1", name: "Bob", role: "TECHNICIAN", status: "ACTIVE", specialties });
const baseTicket = { id: "ticket-1", status: "OPEN", category: "ELECTRICAL", title: "Sparks", unitNumber: "4B", technicianId: null, building: { managerId: "mgr-1" }, tenant: { id: "ten-1" } };

// ── Tests ──────────────────────────────────────────────────────────────────

describe("PATCH /api/tickets/[id]/assign", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns 401 when unauthenticated", async () => {
        (auth as any).mockResolvedValue(null);
        const res = await PATCH(makePatchRequest({ technicianId: "tech-1" }), { params: makeParams() });
        expect(res.status).toBe(401);
    });

    it("returns 401 when role is TENANT", async () => {
        (auth as any).mockResolvedValue(tenantSession);
        const res = await PATCH(makePatchRequest({ technicianId: "tech-1" }), { params: makeParams() });
        expect(res.status).toBe(401);
    });

    it("returns 400 when technician not found (route checks tech first)", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstUser.mockResolvedValue(null); // tech not found
        const res = await PATCH(makePatchRequest({ technicianId: "tech-999" }), { params: makeParams() });
        expect(res.status).toBe(400); // route returns 400 for invalid technician
    });

    it("returns 404 when ticket not found (after tech is found)", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstUser.mockResolvedValue(activeTech(["PLUMBING"])); // tech found
        mockFindFirstTicket.mockResolvedValue(null);                   // ticket NOT found
        const res = await PATCH(makePatchRequest({ technicianId: "tech-1" }), { params: makeParams() });
        expect(res.status).toBe(404);
    });

    it("returns 409 with mismatch when specialties don't match", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstUser.mockResolvedValue(activeTech(["PLUMBING"])); // has PLUMBING
        mockFindFirstTicket.mockResolvedValue({ ...baseTicket, category: "ELECTRICAL" }); // ticket is ELECTRICAL
        const res = await PATCH(makePatchRequest({ technicianId: "tech-1" }), { params: makeParams() });
        expect(res.status).toBe(409);
        const json = await res.json();
        expect(json.requiresMismatchAck).toBe(true);
    });

    it("assigns successfully when specialties match → 200", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstUser.mockResolvedValue(activeTech(["ELECTRICAL"])); // matches ticket
        mockFindFirstTicket.mockResolvedValue(baseTicket);
        const res = await PATCH(makePatchRequest({ technicianId: "tech-1" }), { params: makeParams() });
        expect(res.status).toBe(200);
    });

    it("assigns with mismatch when acknowledgedMismatch:true → 200", async () => {
        (auth as any).mockResolvedValue(managerSession);
        mockFindFirstUser.mockResolvedValue(activeTech(["PLUMBING"])); // wrong specialty
        mockFindFirstTicket.mockResolvedValue({ ...baseTicket, category: "HVAC" });
        const res = await PATCH(
            makePatchRequest({ technicianId: "tech-1", acknowledgedMismatch: true }),
            { params: makeParams() }
        );
        expect(res.status).toBe(200);
    });
});
