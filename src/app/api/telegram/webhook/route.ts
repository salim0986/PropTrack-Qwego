import { NextRequest, NextResponse } from "next/server";
import { handleTelegramMessage, type TelegramUpdate } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token");

  if (!expectedSecret) {
    console.error("TELEGRAM_WEBHOOK_SECRET is missing");
    return NextResponse.json({ message: "Server misconfigured" }, { status: 500 });
  }

  if (receivedSecret !== expectedSecret) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as TelegramUpdate;

    if (body.message) {
      await handleTelegramMessage(body.message);
    }
  } catch (error) {
    // Telegram retries non-200 responses; acknowledge even if parsing fails.
    console.error("Telegram webhook processing error:", error);
  }

  return NextResponse.json({ ok: true });
}
