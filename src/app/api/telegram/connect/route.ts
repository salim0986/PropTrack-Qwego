import { auth } from "@/lib/auth";
import { db } from "@/db";
import { telegramVerificationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const code = generateCode();

    await db.transaction(async (tx) => {
      await tx
        .delete(telegramVerificationsTable)
        .where(eq(telegramVerificationsTable.userId, userId));

      await tx.insert(telegramVerificationsTable).values({
        userId,
        code,
      });
    });

    return NextResponse.json({ code, expiresInSeconds: 600 });
  } catch (error) {
    console.error("Telegram connect code generation error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
