import { db } from "@/db";
import { telegramVerificationsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

type ParseMode = "HTML" | "Markdown";

interface InlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

interface SendMessageOptions {
  parseMode?: ParseMode;
  buttons?: InlineButton[][];
}

export interface TelegramMessage {
  chat?: { id?: number };
  text?: string;
}

export interface TelegramUpdate {
  message?: TelegramMessage;
}

const VERIFICATION_TTL_MS = 10 * 60 * 1000;

function getTelegramBaseUrl(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return `https://api.telegram.org/bot${token}`;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: SendMessageOptions,
) {
  const baseUrl = getTelegramBaseUrl();
  if (!baseUrl) return;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? "HTML",
  };

  if (options?.buttons) {
    body.reply_markup = { inline_keyboard: options.buttons };
  }

  try {
    const res = await fetch(`${baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorPayload = await res.text();
      console.error("[Telegram] sendMessage failed:", errorPayload);
    }
  } catch (error) {
    console.error("[Telegram] sendMessage request failed:", error);
  }
}

export async function handleTelegramMessage(message: TelegramMessage) {
  const chatId = message.chat?.id ? String(message.chat.id) : null;
  const text = message.text?.trim();

  if (!chatId || !text) return;

  if (text === "/start") {
    await sendTelegramMessage(
      chatId,
      "🏢 <b>Welcome to PropTrack!</b>\n\nTo connect your account, open your PropTrack profile and tap <b>Get Connection Code</b>. Then send that code here.",
    );
    return;
  }

  const linkMatch = text.match(/^\/link\s+(\d{4,6})$/);
  if (linkMatch?.[1]) {
    await handleVerificationCode(chatId, linkMatch[1]);
    return;
  }

  if (/^\d{4,6}$/.test(text)) {
    await handleVerificationCode(chatId, text);
    return;
  }

  await sendTelegramMessage(
    chatId,
    "ℹ️ Send your verification code to connect PropTrack notifications.\n\nExample: <code>123456</code>",
  );
}

async function handleVerificationCode(chatId: string, code: string) {
  const pending = await db.query.telegramVerificationsTable.findFirst({
    where: eq(telegramVerificationsTable.code, code),
    with: {
      user: {
        columns: { id: true, name: true },
      },
    },
  });

  if (!pending) {
    await sendTelegramMessage(
      chatId,
      "❌ Invalid or expired code. Please generate a new code from your PropTrack profile.",
    );
    return;
  }

  const isExpired = Date.now() - new Date(pending.createdAt).getTime() > VERIFICATION_TTL_MS;
  if (isExpired) {
    await db.delete(telegramVerificationsTable).where(eq(telegramVerificationsTable.id, pending.id));
    await sendTelegramMessage(
      chatId,
      "⏰ This code has expired. Please generate a new one from your PropTrack profile.",
    );
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ telegramChatId: chatId })
      .where(eq(usersTable.id, pending.userId));

    await tx
      .delete(telegramVerificationsTable)
      .where(eq(telegramVerificationsTable.id, pending.id));
  });

  await sendTelegramMessage(
    chatId,
    `✅ <b>Account connected!</b>\n\nYou will now receive PropTrack updates here. Welcome, ${pending.user.name}!`,
  );
}
