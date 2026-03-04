import { auth } from "@/lib/auth";
import { getProjects } from "@/actions/project";
import ProjectList from "@/components/project/ProjectList";
import type { SessionUser } from "@/types";

export default async function ProjectsPage() {
  const session = await auth();
  const user = session!.user as SessionUser;
  const projects = await getProjects();
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <p className="text-gray-500 mt-1">Organize your boards into projects</p>
      </div>
      <ProjectList projects={projects} isAdmin={isAdmin} />
    </div>
  );
}
