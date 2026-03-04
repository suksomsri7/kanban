"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, FolderKanban, Trash2, Kanban } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { createProject, deleteProject } from "@/actions/project";
import { useRouter } from "next/navigation";

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  owner: { id: string; displayName: string; avatar: string | null };
  members: { user: { id: string; displayName: string; avatar: string | null } }[];
  _count: { boards: number };
}

interface ProjectListProps {
  projects: ProjectData[];
  isAdmin: boolean;
}

const colorPresets = [
  "#111827", "#1e40af", "#059669", "#7c3aed",
  "#dc2626", "#ea580c", "#ca8a04", "#0891b2",
];

export default function ProjectList({ projects, isAdmin }: ProjectListProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedColor, setSelectedColor] = useState(colorPresets[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("color", selectedColor);
    const result = await createProject(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setShowCreate(false);
      router.push(`/project/${result.projectId}`);
    }
    setLoading(false);
  }

  async function handleDelete(projectId: string, name: string) {
    if (!confirm(`Delete project "${name}"? Boards inside will be unlinked.`)) return;
    await deleteProject(projectId);
    router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden"
          >
            <Link href={`/project/${project.id}`} className="block">
              <div
                className="h-2 w-full"
                style={{ backgroundColor: project.color || "#111827" }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: project.color || "#111827" }}
                  >
                    <FolderKanban size={20} className="text-white" />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 truncate">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex -space-x-2">
                    {project.members.slice(0, 4).map((m) => (
                      <Avatar
                        key={m.user.id}
                        name={m.user.displayName}
                        src={m.user.avatar}
                        size="sm"
                      />
                    ))}
                    {project.members.length > 4 && (
                      <div className="h-7 w-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium">
                        +{project.members.length - 4}
                      </div>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Kanban size={12} />
                    {project._count.boards} boards
                  </span>
                </div>
              </div>
            </Link>
            {isAdmin && (
              <div className="px-5 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(project.id, project.name)}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            )}
          </div>
        ))}

        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all min-h-[180px]"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">New Project</span>
          </button>
        )}
      </div>

      {projects.length === 0 && !isAdmin && (
        <div className="text-center py-16">
          <FolderKanban size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 text-sm">You haven&apos;t been added to any projects yet.</p>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          <Input name="name" label="Project Name" required placeholder="e.g. Website Redesign" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
              placeholder="Optional description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
            <div className="flex gap-2">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    selectedColor === c ? "ring-2 ring-offset-2 ring-black scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
