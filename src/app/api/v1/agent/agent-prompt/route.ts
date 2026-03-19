import { NextResponse } from "next/server";
import { AGENT_PROMPT_CONTENT } from "@/lib/agent-prompt-content";

export async function GET() {
  return new NextResponse(AGENT_PROMPT_CONTENT, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
