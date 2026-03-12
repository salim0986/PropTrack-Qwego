import { db } from "@/db";
import { usersTable, registrationRequestsTable, buildingsTable } from "@/db/schema";
import { registerSchema } from "@/lib/validations";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { sendNotification } from "@/lib/notify";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validated = registerSchema.parse(body);

        // Non-negotiable rule: manager accounts are SEEDED only, never registered
        if (validated.role === "MANAGER") {
            return NextResponse.json(
                { message: "Manager accounts cannot be self-registered. Contact your system administrator." },
                { status: 403 }
            );
        }

        // Check for duplicate email
        const existing = await db.query.usersTable.findFirst({
            where: eq(usersTable.email, validated.email),
            columns: { id: true },
        });
        if (existing) {
            return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 });
        }

        // Validate building for tenants
        if (validated.role === "TENANT") {
            if (!validated.buildingId || !validated.unitNumber) {
                return NextResponse.json(
                    { message: "Building and unit number are required for tenant registration." },
                    { status: 400 }
                );
            }
            const building = await db.query.buildingsTable.findFirst({
                where: eq(buildingsTable.id, validated.buildingId),
                columns: { id: true },
            });
            if (!building) {
                return NextResponse.json({ message: "Invalid building selected." }, { status: 400 });
            }
        }

        const passwordHash = await bcrypt.hash(validated.password, 12);

        // Technicians start as PENDING, Tenants start as ACTIVE
        const userStatus = validated.role === "TECHNICIAN" ? "PENDING" : "ACTIVE";

        const result = await db.transaction(async (tx) => {
            const [user] = await tx.insert(usersTable).values({
                name: validated.name,
                email: validated.email,
                passwordHash,
                role: validated.role as any,
                status: userStatus,
                buildingId: validated.buildingId ?? null,
                unitNumber: validated.unitNumber ?? null,
            }).returning();

            // Create a registration request for technicians
            if (validated.role === "TECHNICIAN") {
                await tx.insert(registrationRequestsTable).values({
                    userId: user.id,
                    status: "PENDING",
                });
            }

            return user;
        });

        // Notify all managers about new technician registration request
        if (validated.role === "TECHNICIAN") {
            const managers = await db.query.usersTable.findMany({
                where: eq(usersTable.role, "MANAGER"),
                columns: { id: true },
            });
            await Promise.allSettled(
                managers.map((manager) =>
                    sendNotification({
                        userId: manager.id,
                        title: "New Technician Registration",
                        message: `${validated.name} has requested technician access. Review and approve in the Registrations panel.`,
                        type: "APPROVAL_REQUEST",
                    })
                )
            );
        }

        return NextResponse.json(
            {
                message: validated.role === "TECHNICIAN"
                    ? "Registration submitted. Awaiting manager approval."
                    : "Account created successfully.",
                status: userStatus,
            },
            { status: 201 }
        );

    } catch (error: any) {
        if (error?.name === "ZodError" || error?.issues) {
            const message = error?.errors?.[0]?.message ?? error?.issues?.[0]?.message ?? "Invalid registration data";
            return NextResponse.json({ message }, { status: 400 });
        }
        console.error("Registration error:", error);
        return NextResponse.json({ message: "Registration failed. Please try again." }, { status: 500 });
    }
}
