import { db } from "@/../db";
import { notificationsTable } from "@/../db/schema";
import type { notificationTypeEnum } from "@/../db/schema";

type NotificationType = typeof notificationTypeEnum.enumValues[number];

interface NotifyPayload {
    userId: string;
    ticketId?: string;
    title: string;
    message: string;
    type: NotificationType;
}

export async function sendNotification(payload: NotifyPayload) {
    // 1. Always record In-App Notification (Database)
    await db.insert(notificationsTable).values({
        userId: payload.userId,
        ticketId: payload.ticketId,
        title: payload.title,
        message: payload.message,
        type: payload.type,
    });

    // 2. Fetch User to determine external channels
    const user = await db.query.usersTable.findFirst({
        where: (users, { eq }) => eq(users.id, payload.userId),
        columns: { telegramChatId: true, discordWebhook: true },
    });

    if (!user) return;

    // 3. Dispatch to Telegram (Fire and forget)
    if (user.telegramChatId) {
        sendTelegram(user.telegramChatId, `*${payload.title}*\n${payload.message}`).catch(console.error);
    }

    // 4. Dispatch to Discord (Fire and forget)
    if (user.discordWebhook) {
        sendDiscord(user.discordWebhook, payload.title, payload.message).catch(console.error);
    }
}

async function sendTelegram(chatId: string, text: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown",
        }),
    });
}

async function sendDiscord(webhookUrl: string, title: string, description: string) {
    await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            embeds: [{ title, description, color: 0xF97316 }], // PT Orange
        }),
    });
}
