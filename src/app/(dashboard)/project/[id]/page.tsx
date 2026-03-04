import { auth } from "@/lib/auth";
import { getProjectById } from "@/actions/project";
import { getBoardTemplates } from "@/actions/board";
import { notFound } from "next/navigation";
import ProjectDetail from "@/components/project/ProjectDetail";
import type { SessionUser } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user as SessionUser;
  const project = await getProjectById(id);

  if (!project) notFound();

  const templates = await getBoardTemplates();
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  return <ProjectDetail project={project} templates={templates} isAdmin={isAdmin} currentUser={user} />;
}
