import { NextResponse } from "next/server";
import { SKILL_CONTENT } from "@/lib/skill-content";

export async function GET() {
  return new NextResponse(SKILL_CONTENT, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="skill.md"',
    },
  });
}
