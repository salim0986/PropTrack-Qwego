import { auth } from "@/lib/auth";
import { db } from "@/db";
import { registrationRequestsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ManagerRegistrationsClient } from "./RegistrationsClient";

export default async function ManagerRegistrationsPage() {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "MANAGER") redirect("/login");

    const requests = await db.query.registrationRequestsTable.findMany({
        where: eq(registrationRequestsTable.status, "PENDING"),
        with: {
            user: {
                columns: {
                    id: true, name: true, email: true, phone: true,
                    specialties: true, createdAt: true,
                },
            },
        },
        orderBy: (r, { desc }) => [desc(r.requestedAt)],
    });

    return <ManagerRegistrationsClient initialRequests={requests} />;
}
