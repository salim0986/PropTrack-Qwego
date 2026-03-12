import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockFindFirstUser, mockFindFirstBuilding, mockFindMany } = vi.hoisted(() => ({
    mockFindFirstUser: vi.fn(),
    mockFindFirstBuilding: vi.fn(),
    mockFindMany: vi.fn(() => []),
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notify", () => ({ sendNotification: vi.fn(() => Promise.resolve()) }));
vi.mock("bcryptjs", () => ({
    default: { hash: vi.fn(() => Promise.resolve("hashed_password")) },
    hash: vi.fn(() => Promise.resolve("hashed_password")),
}));

vi.mock("@/db", () => ({
    db: {
        query: {
            usersTable: { findFirst: mockFindFirstUser, findMany: mockFindMany },
            buildingsTable: { findFirst: mockFindFirstBuilding },
        },
        transaction: vi.fn(async (cb: any) => {
            const newUser = { id: "user-1", name: "Test User" };
            const mockTx = {
                insert: vi.fn(() => ({
                    values: vi.fn(() => ({
                        returning: vi.fn(() => [newUser]),
                    })),
                })),
            };
            return cb(mockTx);
        }),
    },
}));

import { POST } from "@/app/api/auth/register/route";

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(body: object) {
    return new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

const tenantBody = {
    name: "Alice Tenant",
    email: "alice@test.com",
    password: "securepassword123",
    role: "TENANT",
    buildingId: "bld-1",
    unitNumber: "4B",
};

const technicianBody = {
    name: "Bob Tech",
    email: "bob@test.com",
    password: "securepassword123",
    role: "TECHNICIAN",
    specialties: ["PLUMBING", "HVAC"],
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFindFirstUser.mockResolvedValue(null);        // no existing user
        mockFindFirstBuilding.mockResolvedValue({ id: "bld-1" }); // building exists
        mockFindMany.mockResolvedValue([]);               // no managers to notify
    });

    it("registers a TENANT successfully → 201", async () => {
        const res = await POST(makeRequest(tenantBody));
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.message).toMatch(/created|registered/i);
    });

    it("registers TECHNICIAN with PENDING status → 201", async () => {
        const res = await POST(makeRequest(technicianBody));
        expect(res.status).toBe(201);
        const json = await res.json();
        expect(json.message).toMatch(/pending|approval/i);
    });

    it("returns 409 when email already exists", async () => {
        mockFindFirstUser.mockResolvedValue({ id: "existing" });
        const res = await POST(makeRequest(tenantBody));
        expect(res.status).toBe(409);
    });

    it("returns 403 when role is MANAGER", async () => {
        const res = await POST(makeRequest({ ...tenantBody, role: "MANAGER" }));
        expect(res.status).toBe(403);
    });

    it("returns 400 for password shorter than minimum", async () => {
        const res = await POST(makeRequest({ ...tenantBody, password: "short" }));
        expect(res.status).toBe(400);
    });

    it("returns 400 for invalid email", async () => {
        const res = await POST(makeRequest({ ...tenantBody, email: "not-an-email" }));
        expect(res.status).toBe(400);
    });

    it("returns 400 when name is missing", async () => {
        const rest = { ...tenantBody };
        delete (rest as any).name;
        const res = await POST(makeRequest(rest as any));
        expect(res.status).toBe(400);
    });
});
