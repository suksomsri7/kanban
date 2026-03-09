"use client";

import { useState, useEffect } from "react";
import {
  Workflow,
  Play,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Bot,
  ChevronDown,
  ChevronUp,
  Trash2,
  X as XIcon,
  MessageSquare,
} from "lucide-react";
import {
  getCardWorkflow,
  getWorkflowTemplates,
  startWorkflow,
  completeWorkflowStep,
  cancelWorkflow,
  deleteWorkflow,
} from "@/actions/workflow";

interface CardWorkflowProps {
  cardId: string;
  boardId: string;
  canManage: boolean;
  currentUserId: string;
}

type Workflow = Awaited<ReturnType<typeof getCardWorkflow>>;
type Template = Awaited<ReturnType<typeof getWorkflowTemplates>>[number];

const STATUS_CONFIG = {
  PENDING: { icon: Circle, color: "text-gray-400", bg: "bg-gray-100", label: "Pending" },
  IN_PROGRESS: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-100", label: "In Progress" },
  COMPLETED: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100", label: "Completed" },
  FAILED: { icon: XCircle, color: "text-red-500", bg: "bg-red-100", label: "Failed" },
  CANCELLED: { icon: XCircle, color: "text-gray-400", bg: "bg-gray-100", label: "Cancelled" },
} as const;

export default function CardWorkflow({ cardId, boardId, canManage, currentUserId }: CardWorkflowProps) {
  const [workflow, setWorkflow] = useState<Workflow>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showStartPanel, setShowStartPanel] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [completeOutput, setCompleteOutput] = useState("");
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflow();
  }, [cardId]);

  async function loadWorkflow() {
    setLoading(true);
    const [wf, tpls] = await Promise.all([
      getCardWorkflow(cardId),
      getWorkflowTemplates(boardId),
    ]);
    setWorkflow(wf);
    setTemplates(tpls);
    setLoading(false);
  }

  async function handleStart(templateId: string) {
    setActing(true);
    const result = await startWorkflow(cardId, boardId, templateId);
    if ("error" in result && result.error) {
      alert(result.error);
    } else {
      setShowStartPanel(false);
      await loadWorkflow();
    }
    setActing(false);
  }

  async function handleComplete(stepId: string) {
    setActing(true);
    const result = await completeWorkflowStep(stepId, completeOutput);
    if ("error" in result && result.error) {
      alert(result.error);
    } else {
      setCompletingStepId(null);
      setCompleteOutput("");
      await loadWorkflow();
    }
    setActing(false);
  }

  async function handleCancel() {
    if (!confirm("Cancel this workflow? In-progress steps will be cancelled.")) return;
    setActing(true);
    await cancelWorkflow(cardId, boardId);
    await loadWorkflow();
    setActing(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this workflow completely?")) return;
    setActing(true);
    await deleteWorkflow(cardId, boardId);
    await loadWorkflow();
    setActing(false);
  }

  if (loading) {
    return (
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          <Workflow size={12} /> Workflow
        </p>
        <div className="text-xs text-gray-400 py-2">Loading...</div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
          <Workflow size={12} /> Workflow
        </p>

        {!showStartPanel ? (
          canManage && templates.length > 0 ? (
            <button
              onClick={() => setShowStartPanel(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-violet-300 rounded-lg text-xs text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <Play size={12} /> Start Workflow
            </button>
          ) : templates.length === 0 ? (
            <p className="text-[10px] text-gray-400">
              No workflow templates. Create one in the board&apos;s workflow settings.
            </p>
          ) : null
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">Choose a template:</p>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => handleStart(tpl.id)}
                disabled={acting}
                className="w-full text-left px-3 py-2 border border-gray-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 transition-colors disabled:opacity-50"
              >
                <p className="text-xs font-medium text-gray-800">{tpl.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{tpl.steps.length} steps</p>
              </button>
            ))}
            <button
              onClick={() => setShowStartPanel(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[workflow.status];
  const StatusIcon = statusCfg.icon;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <Workflow size={12} /> Workflow
        </p>
        <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
          <StatusIcon size={10} className={workflow.status === "IN_PROGRESS" ? "animate-spin" : ""} />
          {statusCfg.label}
        </div>
      </div>

      <div className="space-y-1.5">
        {workflow.steps.map((step, idx) => {
          const stepCfg = STATUS_CONFIG[step.status];
          const StepIcon = stepCfg.icon;
          const isExpanded = expandedStep === step.id;
          const isMyStep = step.assigneeId === currentUserId;
          const canComplete = step.status === "IN_PROGRESS" && (isMyStep || canManage);

          return (
            <div key={step.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <StepIcon
                  size={14}
                  className={`${stepCfg.color} shrink-0 ${step.status === "IN_PROGRESS" ? "animate-spin" : ""}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">#{idx + 1}</span>
                    <span className="text-xs font-medium text-gray-800 truncate">{step.title}</span>
                  </div>
                  {step.assignee && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      {step.assignee.isAgent && <Bot size={9} />}
                      {step.assignee.displayName}
                    </p>
                  )}
                </div>
                {isExpanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
              </div>

              {isExpanded && (
                <div className="px-3 pb-2.5 border-t border-gray-100 space-y-2">
                  {step.instructions && (
                    <div className="mt-2">
                      <p className="text-[10px] text-gray-400 mb-0.5">Instructions:</p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{step.instructions}</p>
                    </div>
                  )}

                  {step.output && (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
                        <MessageSquare size={9} /> Output:
                      </p>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-2">{step.output}</p>
                    </div>
                  )}

                  {step.startedAt && (
                    <p className="text-[10px] text-gray-400">
                      Started: {new Date(step.startedAt).toLocaleString("th-TH")}
                    </p>
                  )}
                  {step.completedAt && (
                    <p className="text-[10px] text-gray-400">
                      Completed: {new Date(step.completedAt).toLocaleString("th-TH")}
                    </p>
                  )}

                  {canComplete && completingStepId !== step.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setCompletingStepId(step.id); }}
                      className="w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 mt-1"
                    >
                      <CheckCircle2 size={12} /> Mark Complete
                    </button>
                  )}

                  {completingStepId === step.id && (
                    <div className="space-y-2 mt-1">
                      <textarea
                        value={completeOutput}
                        onChange={(e) => setCompleteOutput(e.target.value)}
                        rows={2}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                        placeholder="Output / notes (optional)..."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleComplete(step.id)}
                          disabled={acting}
                          className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {acting ? "Saving..." : "Complete"}
                        </button>
                        <button
                          onClick={() => { setCompletingStepId(null); setCompleteOutput(""); }}
                          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canManage && (workflow.status === "IN_PROGRESS" || workflow.status === "PENDING") && (
        <button
          onClick={handleCancel}
          className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500"
        >
          <XCircle size={10} /> Cancel workflow
        </button>
      )}

      {canManage && (workflow.status === "COMPLETED" || workflow.status === "CANCELLED" || workflow.status === "FAILED") && (
        <button
          onClick={handleDelete}
          className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500"
        >
          <Trash2 size={10} /> Remove workflow
        </button>
      )}
    </div>
  );
}
