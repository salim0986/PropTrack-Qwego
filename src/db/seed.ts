import { db } from "./index";
import {
    usersTable,
    buildingsTable,
    ticketsTable,
    activityLogsTable,
    notificationsTable,
    registrationRequestsTable
} from "./schema";
import * as bcrypt from "bcryptjs";

async function main() {
    console.log("Seeding database...");
    const passwordHash = await bcrypt.hash("Demo1234!", 10);

    // 1. Seed Manager
    const [manager] = await db.insert(usersTable).values({
        name: "Diana Park",
        email: "manager@proptrack.io",
        passwordHash,
        role: "MANAGER",
        status: "ACTIVE",
        telegramChatId: null, // Simulated linked
        discordWebhook: null,
    }).returning();

    // 2. Seed Buildings
    const [elmCourt, mapleTower] = await db.insert(buildingsTable).values([
        { name: "Elm Court", address: "100 Elm St.", managerId: manager.id },
        { name: "Maple Tower", address: "200 Maple Ave.", managerId: manager.id },
        { name: "Birch Plaza", address: "300 Birch Blvd.", managerId: manager.id },
    ]).returning();

    // 3. Seed Tenants
    const [tenant1, tenant2] = await db.insert(usersTable).values([
        { name: "Sarah Mitchell", email: "tenant@proptrack.io", passwordHash, role: "TENANT", status: "ACTIVE", buildingId: elmCourt.id, unitNumber: "4B" },
        { name: "James Okafor", email: "tenant2@proptrack.io", passwordHash, role: "TENANT", status: "ACTIVE", buildingId: mapleTower.id, unitNumber: "2A" },
    ]).returning();

    // 4. Seed Technicians
    const [tech1, tech2, techPending] = await db.insert(usersTable).values([
        { name: "Carlos Rodriguez", email: "tech@proptrack.io", passwordHash, role: "TECHNICIAN", status: "ACTIVE", specialties: ["PLUMBING"] },
        { name: "Marcus Thompson", email: "tech2@proptrack.io", passwordHash, role: "TECHNICIAN", status: "ACTIVE", specialties: ["ELECTRICAL"] },
        { name: "Kwame Asante", email: "pending@proptrack.io", passwordHash, role: "TECHNICIAN", status: "PENDING", specialties: ["HVAC"] },
    ]).returning();

    // 5. Seed Reg Request
    await db.insert(registrationRequestsTable).values({
        userId: techPending.id,
        status: "PENDING"
    });

    // 6. Seed Tickets (Various Statuses)
    const [openTicket] = await db.insert(ticketsTable).values({
        title: "Leaky Faucet",
        description: "The kitchen faucet is dripping constantly.",
        category: "PLUMBING",
        priority: "LOW",
        tenantId: tenant1.id,
        buildingId: elmCourt.id,
        unitNumber: "4B",
        status: "OPEN"
    }).returning();

    const [assignedTicket] = await db.insert(ticketsTable).values({
        title: "Flickering Lights",
        description: "Hallway lights are flickering since yesterday.",
        category: "ELECTRICAL",
        priority: "MEDIUM",
        tenantId: tenant2.id,
        technicianId: tech2.id,
        buildingId: mapleTower.id,
        unitNumber: "2A",
        status: "ASSIGNED"
    }).returning();

    const [blockedTicket] = await db.insert(ticketsTable).values({
        title: "Broken Heater",
        description: "No heat at all",
        category: "HVAC",
        priority: "HIGH",
        tenantId: tenant1.id,
        technicianId: tech1.id,
        buildingId: elmCourt.id,
        unitNumber: "4B",
        status: "BLOCKED",
        blockReason: "Waiting on parts"
    }).returning();

    const [doneTicket] = await db.insert(ticketsTable).values({
        title: "Dryer Outlet broken",
        description: "Outlet is burnt",
        category: "ELECTRICAL",
        priority: "MEDIUM",
        tenantId: tenant2.id,
        technicianId: tech2.id,
        buildingId: mapleTower.id,
        unitNumber: "2A",
        status: "DONE",
        completionVerified: true,
        resolutionNotes: "Replaced the 220V outlet completely and tested voltage."
    }).returning();

    // Log Activity Example
    await db.insert(activityLogsTable).values([
        { ticketId: openTicket.id, actorId: tenant1.id, action: "CREATED" },
        { ticketId: assignedTicket.id, actorId: manager.id, action: "ASSIGNED", newValue: tech2.name },
        { ticketId: blockedTicket.id, actorId: tech1.id, action: "BLOCKED", message: "Waiting on parts" },
        { ticketId: doneTicket.id, actorId: tech2.id, action: "COMPLETION_SUBMITTED" }
    ]);

    // Notifications Example
    await db.insert(notificationsTable).values([
        { userId: manager.id, title: "New Ticket", message: "Sarah Mitchell submitted a new Plumbing ticket.", type: "TICKET_CREATED", ticketId: openTicket.id },
        { userId: tenant2.id, title: "Ticket Assigned", message: "Marcus Thompson has been assigned to your ticket.", type: "TICKET_ASSIGNED", ticketId: assignedTicket.id },
    ]);

    console.log("Database seeded successfully!");
}

main().catch(console.error).finally(() => process.exit(0));
