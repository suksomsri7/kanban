"use client";

import { useState, useEffect } from "react";
import { X, Workflow, Plus, Trash2, GripVertical, Bot, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import {
  getWorkflowTemplates,
  createWorkflowTemplate,
  updateWorkflowTemplate,
  deleteWorkflowTemplate,
  getWorkflowAssignees,
} from "@/actions/workflow";

interface WorkflowTemplatePanelProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

type AgentOption = { id: string; displayName: string; avatar: string | null; isAgent: boolean };
type TemplateStep = { id?: string; title: string; instructions: string; assigneeId?: string };
type Template = Awaited<ReturnType<typeof getWorkflowTemplates>>[number];

export default function WorkflowTemplatePanel({ boardId, isOpen, onClose }: WorkflowTemplatePanelProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formSteps, setFormSteps] = useState<TemplateStep[]>([
    { title: "", instructions: "", assigneeId: "" },
  ]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, boardId]);

  async function loadData() {
    setLoading(true);
    const [t, a] = await Promise.all([
      getWorkflowTemplates(boardId),
      getWorkflowAssignees(),
    ]);
    setTemplates(t);
    setAgents(a);
    setLoading(false);
  }

  function resetForm() {
    setFormName("");
    setFormSteps([{ title: "", instructions: "", assigneeId: "" }]);
    setError("");
    setEditingTemplate(null);
    setShowForm(false);
  }

  function openEdit(tpl: Template) {
    setEditingTemplate(tpl);
    setFormName(tpl.name);
    setFormSteps(
      tpl.steps.map((s) => ({
        id: s.id,
        title: s.title,
        instructions: s.instructions,
        assigneeId: s.assigneeId || "",
      }))
    );
    setShowForm(true);
    setError("");
  }

  function addStep() {
    setFormSteps([...formSteps, { title: "", instructions: "", assigneeId: "" }]);
  }

  function removeStep(idx: number) {
    if (formSteps.length <= 1) return;
    setFormSteps(formSteps.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof TemplateStep, value: string) {
    setFormSteps(formSteps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  async function handleSave() {
    setError("");
    if (!formName.trim()) { setError("Template name is required"); return; }
    if (formSteps.some((s) => !s.title.trim())) { setError("All steps must have a title"); return; }

    setLoading(true);
    const stepsData = formSteps.map((s) => ({
      title: s.title.trim(),
      instructions: s.instructions.trim(),
      assigneeId: s.assigneeId || undefined,
    }));

    const result = editingTemplate
      ? await updateWorkflowTemplate(editingTemplate.id, formName.trim(), stepsData)
      : await createWorkflowTemplate(boardId, formName.trim(), stepsData);

    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      resetForm();
      await loadData();
    }
    setLoading(false);
  }

  async function handleDelete(tplId: string) {
    if (!confirm("Delete this workflow template?")) return;
    await deleteWorkflowTemplate(tplId);
    await loadData();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-violet-600" />
            <h2 className="font-semibold text-gray-900">Workflow Templates</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!showForm ? (
            <>
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-colors mb-4"
              >
                <Plus size={16} /> Create Template
              </button>

              {loading && !templates.length ? (
                <p className="text-center text-sm text-gray-400 py-8">Loading...</p>
              ) : templates.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No workflow templates yet</p>
              ) : (
                <div className="space-y-3">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Workflow size={14} className="text-violet-500" />
                          <span className="text-sm font-medium text-gray-900">{tpl.name}</span>
                          <span className="text-xs text-gray-400">{tpl.steps.length} steps</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(tpl); }}
                            className="p-1 rounded hover:bg-gray-200 text-gray-400"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                          {expandedId === tpl.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </div>

                      {expandedId === tpl.id && (
                        <div className="px-4 pb-3 border-t border-gray-100">
                          <div className="space-y-2 mt-2">
                            {tpl.steps.map((step, idx) => (
                              <div key={step.id} className="flex items-start gap-2 text-xs">
                                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-medium mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800">{step.title}</p>
                                  {step.assignee && (
                                    <p className="text-gray-400 flex items-center gap-1 mt-0.5">
                                      {step.assignee.isAgent && <Bot size={10} />}
                                      {step.assignee.displayName}
                                    </p>
                                  )}
                                  {step.instructions && (
                                    <p className="text-gray-400 mt-0.5 line-clamp-2">{step.instructions}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-800">
                {editingTemplate ? "Edit Template" : "New Template"}
              </h3>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="e.g. Content Creation"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Steps</label>
                <div className="space-y-3">
                  {formSteps.map((step, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical size={14} className="text-gray-300" />
                          <span className="text-xs font-semibold text-violet-600">Step {idx + 1}</span>
                        </div>
                        {formSteps.length > 1 && (
                          <button onClick={() => removeStep(idx)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <input
                        value={step.title}
                        onChange={(e) => updateStep(idx, "title", e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Step title (e.g. Research)"
                      />

                      <select
                        value={step.assigneeId || ""}
                        onChange={(e) => updateStep(idx, "assigneeId", e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.isAgent ? "🤖 " : "👤 "}{a.displayName}
                          </option>
                        ))}
                      </select>

                      <textarea
                        value={step.instructions}
                        onChange={(e) => updateStep(idx, "instructions", e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                        placeholder="Instructions / Prompt for this step..."
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={addStep}
                  className="mt-2 flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
                >
                  <Plus size={14} /> Add Step
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editingTemplate ? "Update" : "Create"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
