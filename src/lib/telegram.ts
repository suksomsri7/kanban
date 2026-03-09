const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not configured, skipping notification");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Telegram send failed:", err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Telegram send error:", err);
    return false;
  }
}

export function buildWorkflowNotification(params: {
  cardTitle: string;
  stepTitle: string;
  instructions: string;
  boardUrl: string;
  previousOutput?: string | null;
}): string {
  const lines = [
    `<b>📋 มีงานใหม่จาก Kanban</b>`,
    ``,
    `<b>Card:</b> ${escapeHtml(params.cardTitle)}`,
    `<b>งาน:</b> ${escapeHtml(params.stepTitle)}`,
    ``,
    `<b>คำสั่ง:</b>`,
    escapeHtml(params.instructions),
  ];

  if (params.previousOutput) {
    lines.push(
      ``,
      `<b>ผลลัพธ์จาก Step ก่อนหน้า:</b>`,
      escapeHtml(params.previousOutput.slice(0, 500))
    );
  }

  lines.push(``, `🔗 ${params.boardUrl}`);

  return lines.join("\n");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
