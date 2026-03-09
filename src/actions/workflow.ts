"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type { SessionUser } from "@/types";
import { requireBoardPermission } from "@/lib/permissions";
import { logActivity } from "@/actions/activity";
import { sendTelegramMessage, buildWorkflowNotification } from "@/lib/telegram";
import { generateKeyBetween } from "fractional-indexing";

// ==================== WORKFLOW TEMPLATES ====================

export async function getWorkflowTemplates(boardId: string) {
  await requireAuth();

  return prisma.workflowTemplate.findMany({
    where: { boardId },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          assignee: { select: { id: true, displayName: true, avatar: true, isAgent: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createWorkflowTemplate(
  boardId: string,
  name: string,
  steps: { title: string; instructions: string; assigneeId?: string }[]
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(
    boardId, user.id, user.role, "canManageWorkflow"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  if (!name.trim()) return { error: "Template name is required" };
  if (steps.length === 0) return { error: "At least one step is required" };

  const existing = await prisma.workflowTemplate.findUnique({
    where: { boardId_name: { boardId, name: name.trim() } },
  });
  if (existing) return { error: "Template name already exists for this board" };

  let order: string | null = null;
  const stepsData = steps.map((s) => {
    order = generateKeyBetween(order, null);
    return {
      title: s.title,
      instructions: s.instructions,
      assigneeId: s.assigneeId || null,
      order,
    };
  });

  const template = await prisma.workflowTemplate.create({
    data: {
      name: name.trim(),
      boardId,
      steps: { create: stepsData },
    },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          assignee: { select: { id: true, displayName: true, avatar: true, isAgent: true } },
        },
      },
    },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true, template };
}

export async function updateWorkflowTemplate(
  templateId: string,
  name: string,
  steps: { id?: string; title: string; instructions: string; assigneeId?: string }[]
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
    select: { boardId: true },
  });
  if (!template) return { error: "Template not found" };

  const { allowed, error: permErr } = await requireBoardPermission(
    template.boardId, user.id, user.role, "canManageWorkflow"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.workflowTemplateStep.deleteMany({ where: { templateId } });

  let order: string | null = null;
  const stepsData = steps.map((s) => {
    order = generateKeyBetween(order, null);
    return {
      title: s.title,
      instructions: s.instructions,
      assigneeId: s.assigneeId || null,
      order,
    };
  });

  await prisma.workflowTemplate.update({
    where: { id: templateId },
    data: {
      name: name.trim(),
      steps: { create: stepsData },
    },
  });

  revalidatePath(`/board/${template.boardId}`);
  return { success: true };
}

export async function deleteWorkflowTemplate(templateId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const template = await prisma.workflowTemplate.findUnique({
    where: { id: templateId },
    select: { boardId: true },
  });
  if (!template) return { error: "Template not found" };

  const { allowed, error: permErr } = await requireBoardPermission(
    template.boardId, user.id, user.role, "canManageWorkflow"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.workflowTemplate.delete({ where: { id: templateId } });

  revalidatePath(`/board/${template.boardId}`);
  return { success: true };
}

// ==================== CARD WORKFLOW ====================

export async function getCardWorkflow(cardId: string) {
  await requireAuth();

  return prisma.cardWorkflow.findUnique({
    where: { cardId },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          assignee: { select: { id: true, displayName: true, avatar: true, isAgent: true } },
        },
      },
      creator: { select: { id: true, displayName: true } },
    },
  });
}

export async function startWorkflow(
  cardId: string,
  boardId: string,
  templateId?: string,
  customSteps?: { title: string; instructions: string; assigneeId?: string }[]
) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(
    boardId, user.id, user.role, "canManageWorkflow"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  const existingWorkflow = await prisma.cardWorkflow.findUnique({ where: { cardId } });
  if (existingWorkflow) return { error: "Card already has an active workflow" };

  let stepsInput: { title: string; instructions: string; assigneeId?: string | null }[] = [];

  if (templateId) {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id: templateId },
      include: { steps: { orderBy: { order: "asc" } } },
    });
    if (!template) return { error: "Template not found" };
    stepsInput = template.steps.map((s) => ({
      title: s.title,
      instructions: s.instructions,
      assigneeId: s.assigneeId,
    }));
  } else if (customSteps && customSteps.length > 0) {
    stepsInput = customSteps;
  } else {
    return { error: "Template or custom steps required" };
  }

  let order: string | null = null;
  const stepsData = stepsInput.map((s, idx) => {
    order = generateKeyBetween(order, null);
    return {
      title: s.title,
      instructions: s.instructions,
      assigneeId: s.assigneeId || null,
      order,
      status: idx === 0 ? ("IN_PROGRESS" as const) : ("PENDING" as const),
      startedAt: idx === 0 ? new Date() : null,
    };
  });

  const workflow = await prisma.cardWorkflow.create({
    data: {
      cardId,
      templateId: templateId || null,
      status: "IN_PROGRESS",
      createdBy: user.id,
      steps: { create: stepsData },
    },
    include: {
      steps: {
        orderBy: { order: "asc" },
        include: {
          assignee: {
            select: { id: true, displayName: true, avatar: true, isAgent: true, telegramChatId: true },
          },
        },
      },
    },
  });

  await logActivity("WORKFLOW_STARTED", boardId, user.id, { cardId }, cardId);

  const firstStep = workflow.steps[0];
  if (firstStep?.assignee?.telegramChatId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { title: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://kanban.suksomsri.cloud";
    await sendTelegramMessage(
      firstStep.assignee.telegramChatId,
      buildWorkflowNotification({
        cardTitle: card?.title || "Untitled",
        stepTitle: firstStep.title,
        instructions: firstStep.instructions,
        boardUrl: `${baseUrl}/board/${boardId}`,
      })
    );
  }

  revalidatePath(`/board/${boardId}`);
  return { success: true, workflowId: workflow.id };
}

export async function completeWorkflowStep(stepId: string, output?: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const step = await prisma.cardWorkflowStep.findUnique({
    where: { id: stepId },
    include: {
      workflow: {
        include: {
          card: { select: { id: true, title: true, column: { select: { boardId: true } } } },
          steps: {
            orderBy: { order: "asc" },
            include: {
              assignee: {
                select: { id: true, displayName: true, telegramChatId: true, isAgent: true },
              },
            },
          },
        },
      },
    },
  });

  if (!step) return { error: "Step not found" };
  if (step.status !== "IN_PROGRESS") return { error: "Step is not in progress" };

  const boardId = step.workflow.card.column.boardId;

  const isAssignee = step.assigneeId === user.id;
  const isAdminOrAbove = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  if (!isAssignee && !isAdminOrAbove) {
    const { allowed } = await requireBoardPermission(boardId, user.id, user.role, "canManageWorkflow");
    if (!allowed) return { error: "Only the assigned agent or a workflow manager can complete this step" };
  }

  await prisma.cardWorkflowStep.update({
    where: { id: stepId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      output: output?.trim() || null,
    },
  });

  await logActivity(
    "WORKFLOW_STEP_COMPLETED",
    boardId,
    user.id,
    { stepTitle: step.title },
    step.workflow.card.id
  );

  const allSteps = step.workflow.steps;
  const currentIdx = allSteps.findIndex((s) => s.id === stepId);
  const nextStep = allSteps[currentIdx + 1];

  if (nextStep) {
    await prisma.cardWorkflowStep.update({
      where: { id: nextStep.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    if (nextStep.assignee?.telegramChatId) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://kanban.suksomsri.cloud";
      await sendTelegramMessage(
        nextStep.assignee.telegramChatId,
        buildWorkflowNotification({
          cardTitle: step.workflow.card.title,
          stepTitle: nextStep.title,
          instructions: nextStep.instructions,
          boardUrl: `${baseUrl}/board/${boardId}`,
          previousOutput: output,
        })
      );
    }
  } else {
    await prisma.cardWorkflow.update({
      where: { id: step.workflowId },
      data: { status: "COMPLETED" },
    });

    await logActivity(
      "WORKFLOW_COMPLETED",
      boardId,
      user.id,
      { cardTitle: step.workflow.card.title },
      step.workflow.card.id
    );
  }

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function cancelWorkflow(cardId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(
    boardId, user.id, user.role, "canManageWorkflow"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  const workflow = await prisma.cardWorkflow.findUnique({ where: { cardId } });
  if (!workflow) return { error: "No workflow on this card" };

  await prisma.cardWorkflowStep.updateMany({
    where: { workflowId: workflow.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
    data: { status: "CANCELLED" },
  });

  await prisma.cardWorkflow.update({
    where: { id: workflow.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

export async function deleteWorkflow(cardId: string, boardId: string) {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  const { allowed, error: permErr } = await requireBoardPermission(
    boardId, user.id, user.role, "canManageWorkflow"
  );
  if (!allowed) return { error: permErr || "Permission denied" };

  await prisma.cardWorkflow.deleteMany({ where: { cardId } });

  revalidatePath(`/board/${boardId}`);
  return { success: true };
}

// ==================== AGENT HELPERS ====================

export async function getAgentUsers() {
  await requireAuth();

  return prisma.user.findMany({
    where: { isAgent: true, isActive: true },
    select: { id: true, displayName: true, username: true, avatar: true, telegramChatId: true },
    orderBy: { displayName: "asc" },
  });
}

export async function getWorkflowAssignees() {
  await requireAuth();

  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, displayName: true, avatar: true, isAgent: true },
    orderBy: [{ isAgent: "desc" }, { displayName: "asc" }],
  });
}
