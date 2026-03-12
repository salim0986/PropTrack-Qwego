require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const secret = requireEnv("TELEGRAM_WEBHOOK_SECRET");
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
  const webhookUrl = `${appUrl}/api/telegram/webhook`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  const payload = await res.json();

  if (!res.ok || !payload.ok) {
    throw new Error(`Failed to set webhook: ${JSON.stringify(payload)}`);
  }

  console.log("Telegram webhook registered successfully.");
  console.log(`Webhook URL: ${webhookUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
