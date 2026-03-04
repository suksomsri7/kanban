import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import ReactPDF from "@react-pdf/renderer";
import { ReportDocument } from "@/lib/pdf-template";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const boards = await prisma.board.findMany({
    where: { isArchived: false },
    select: {
      title: true,
      brand: { select: { name: true } },
      _count: { select: { members: true } },
      columns: {
        select: {
          title: true,
          _count: { select: { cards: { where: { isArchived: false } } } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const boardRows = boards.map((b) => {
    const totalCards = b.columns.reduce((s, c) => s + c._count.cards, 0);
    const doneCards = b.columns
      .filter((c) => c.title.toLowerCase().includes("done") || c.title.toLowerCase().includes("complete"))
      .reduce((s, c) => s + c._count.cards, 0);
    return {
      title: b.title,
      brand: b.brand?.name || "—",
      members: b._count.members,
      totalCards,
      doneCards,
      progress: totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0,
    };
  });

  const overdueCards = await prisma.card.findMany({
    where: { isArchived: false, dueDate: { lt: new Date() } },
    select: {
      title: true,
      priority: true,
      dueDate: true,
      column: { select: { title: true, board: { select: { title: true } } } },
      assignees: { include: { user: { select: { displayName: true } } } },
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  });

  const overdueRows = overdueCards.map((c) => ({
    title: c.title,
    board: c.column.board.title,
    status: c.column.title,
    priority: c.priority,
    dueDate: c.dueDate ? c.dueDate.toISOString().split("T")[0] : "—",
    assignees: c.assignees.map((a) => a.user.displayName).join(", ") || "—",
  }));

  const [totalCards, totalBrands, totalUsers] = await Promise.all([
    prisma.card.count({ where: { isArchived: false } }),
    prisma.brand.count({ where: { isArchived: false } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  const stats = {
    totalCards,
    totalBrands,
    totalBoards: boards.length,
    totalUsers,
    overdueCount: overdueCards.length,
  };

  const doc = ReportDocument({ boardRows, overdueRows, stats, generatedBy: user.displayName });
  const pdfStream = await ReactPDF.renderToStream(doc);

  const chunks: Uint8Array[] = [];
  for await (const chunk of pdfStream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kanban-report-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
