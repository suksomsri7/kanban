"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import type { SessionUser } from "@/types";

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
});

export async function getProjects() {
  const session = await requireAuth();
  const user = session.user as SessionUser;

  if (user.role === "SUPER_ADMIN") {
    return prisma.project.findMany({
      where: { isArchived: false },
      include: {
        owner: { select: { id: true, displayName: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, displayName: true, avatar: true } },
          },
        },
        _count: { select: { boards: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  return prisma.project.findMany({
    where: {
      isArchived: false,
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, displayName: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, avatar: true } },
        },
      },
      _count: { select: { boards: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProjectById(projectId: string) {
  await requireAuth();

  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, displayName: true, username: true, avatar: true } },
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatar: true } },
        },
      },
      boards: {
        where: { isArchived: false },
        include: {
          owner: { select: { id: true, displayName: true } },
          members: {
            include: {
              user: { select: { id: true, displayName: true, avatar: true } },
            },
          },
          _count: { select: { columns: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function createProject(formData: FormData) {
  const session = await requireAdmin();
  const user = session.user as SessionUser;

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = CreateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color || "#111827",
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  revalidatePath("/projects");
  return { success: true, projectId: project.id };
}

export async function updateProject(formData: FormData) {
  await requireAuth();

  const raw = {
    id: formData.get("id") as string,
    name: (formData.get("name") as string) || undefined,
    description: formData.get("description") as string | undefined,
    color: (formData.get("color") as string) || undefined,
  };

  const parsed = UpdateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, ...data } = parsed.data;
  await prisma.project.update({ where: { id }, data });

  revalidatePath("/projects");
  revalidatePath(`/project/${id}`);
  return { success: true };
}

export async function deleteProject(projectId: string) {
  await requireAdmin();

  await prisma.project.update({
    where: { id: projectId },
    data: { isArchived: true },
  });

  revalidatePath("/projects");
  return { success: true };
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: "EDITOR" | "VIEWER" = "EDITOR"
) {
  await requireAuth();

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: { role },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}

export async function removeProjectMember(projectId: string, userId: string) {
  await requireAuth();

  await prisma.projectMember.deleteMany({
    where: { projectId, userId },
  });

  revalidatePath(`/project/${projectId}`);
  return { success: true };
}
