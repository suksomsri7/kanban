"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Bot, Clock, Key, Globe, FileText, Power, Plus, Trash2, Shield, Zap, Copy, RefreshCw, ExternalLink } from "lucide-react";
import { getColumnSettings, updateColumnSettings } from "@/actions/column";
import { AGENT_PROMPT_CONTENT } from "@/lib/agent-prompt-content";

const AI_PROVIDERS = [
  { value: "", label: "-- Select --" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
];

const TIMEZONES = [
  "Asia/Bangkok", "Asia/Tokyo", "Asia/Singapore", "Asia/Shanghai",
  "Asia/Kolkata", "Europe/London", "Europe/Berlin",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Pacific/Auckland", "UTC",
];

const DAYS_OF_WEEK = [
  { key: "mon", label: "จ", full: "Monday" },
  { key: "tue", label: "อ", full: "Tuesday" },
  { key: "wed", label: "พ", full: "Wednesday" },
  { key: "thu", label: "พฤ", full: "Thursday" },
  { key: "fri", label: "ศ", full: "Friday" },
  { key: "sat", label: "ส", full: "Saturday" },
  { key: "sun", label: "อา", full: "Sunday" },
] as const;

type DayKey = (typeof DAYS_OF_WEEK)[number]["key"];
type TimeSlot = { h: number; m: number; s: number };
type DaySchedule = Record<string, TimeSlot[]>;
type CronData =
  | { type: "daily"; times: TimeSlot[] }
  | { type: "weekly"; days: DaySchedule }
  | { type: "interval"; every: number; unit: "minutes" | "hours" };

function parseCronData(raw: string | null): CronData {
  if (!raw) return { type: "daily", times: [{ h: 9, m: 0, s: 0 }] };
  try { return JSON.parse(raw); } catch { return { type: "daily", times: [{ h: 9, m: 0, s: 0 }] }; }
}
function defaultWeekly(): CronData {
  return { type: "weekly", days: { mon: [{ h: 9, m: 0, s: 0 }], tue: [{ h: 9, m: 0, s: 0 }], wed: [{ h: 9, m: 0, s: 0 }], thu: [{ h: 9, m: 0, s: 0 }], fri: [{ h: 9, m: 0, s: 0 }] } };
}

const OPENCLAW_PERMS = [
  { group: "Card", items: [
    { key: "canCreateCard", label: "Create Card" },
    { key: "canDeleteCard", label: "Delete Card" },
    { key: "canMoveCard", label: "Move / Stage By" },
    { key: "canDuplicateCard", label: "Duplicate Card" },
    { key: "canReferCard", label: "Refer Card" },
  ]},
  { group: "Card Editing", items: [
    { key: "canEditCardTitle", label: "Edit Title" },
    { key: "canEditCardDescription", label: "Edit Description" },
    { key: "canEditCardPriority", label: "Edit Priority" },
    { key: "canEditCardDueDate", label: "Edit Due Date" },
    { key: "canEditCardLabels", label: "Edit Labels" },
    { key: "canEditCardAssignees", label: "Edit Assignees" },
  ]},
  { group: "Other", items: [
    { key: "canManageLabels", label: "Manage Labels" },
    { key: "canManageSubtasks", label: "Manage Subtasks / Checklist" },
    { key: "canUploadAttachment", label: "Upload Attachment" },
    { key: "canAddDependency", label: "Add Dependency" },
    { key: "canComment", label: "Comment" },
  ]},
];

const ALL_PERM_KEYS = OPENCLAW_PERMS.flatMap((g) => g.items.map((i) => i.key));

interface Props {
  columnId: string;
  columnTitle: string;
  onClose: () => void;
}

export default function ColumnSettingsDialog({ columnId, columnTitle, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [automationType, setAutomationType] = useState<"ai_config" | "openclaw">("ai_config");
  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [cronEnabled, setCronEnabled] = useState(false);
  const [cronData, setCronData] = useState<CronData>({ type: "daily", times: [{ h: 9, m: 0, s: 0 }] });
  const [cronTimezone, setCronTimezone] = useState("Asia/Bangkok");
  const [apiKey, setApiKey] = useState("");
  const [webhook, setWebhook] = useState("");
  const [prompt, setPrompt] = useState("");
  const [automationStatus, setAutomationStatus] = useState("pause");

  const [openclawUrl, setOpenclawUrl] = useState("");
  const [openclawApiKey, setOpenclawApiKey] = useState("");
  const [openclawPerms, setOpenclawPerms] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function generateApiKey() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "oc_";
    for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
    return key;
  }

  function buildWebhookUrl(key: string) {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/api/v1/agent/${columnId}?key=${key}`;
  }

  function regenerateWebhook() {
    const newKey = generateApiKey();
    setOpenclawApiKey(newKey);
    setOpenclawUrl(buildWebhookUrl(newKey));
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  useEffect(() => {
    getColumnSettings(columnId).then((data) => {
      if (data) {
        setAutomationType((data.automationType as "ai_config" | "openclaw") || "ai_config");
        setAiProvider(data.aiProvider || "");
        setAiModel(data.aiModel || "");
        setCronEnabled(data.cronEnabled);
        setCronTimezone(data.cronTimezone || "Asia/Bangkok");
        setCronData(parseCronData(data.cronExpr));
        setApiKey(data.apiKey || "");
        setWebhook(data.webhook || "");
        setPrompt(data.prompt || "");
        setAutomationStatus(data.automationStatus || "pause");
        if (data.openclawPermissions && typeof data.openclawPermissions === "object") {
          setOpenclawPerms(data.openclawPermissions as Record<string, boolean>);
        }
        const key = data.openclawApiKey || generateApiKey();
        setOpenclawApiKey(key);
        const base = typeof window !== "undefined" ? window.location.origin : "";
        setOpenclawUrl(data.openclawUrl || `${base}/api/v1/agent/${columnId}?key=${key}`);
      }
      setLoading(false);
    });
  }, [columnId]);

  function togglePerm(key: string) {
    setOpenclawPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  }
  function setAllPerms(val: boolean) {
    const perms: Record<string, boolean> = {};
    ALL_PERM_KEYS.forEach((k) => { perms[k] = val; });
    setOpenclawPerms(perms);
  }

  // --- Daily helpers ---
  function addDailySlot() { if (cronData.type !== "daily") return; setCronData({ ...cronData, times: [...cronData.times, { h: 12, m: 0, s: 0 }] }); }
  function removeDailySlot(idx: number) { if (cronData.type !== "daily" || cronData.times.length <= 1) return; setCronData({ ...cronData, times: cronData.times.filter((_, i) => i !== idx) }); }
  function updateDailySlot(idx: number, field: keyof TimeSlot, value: number) { if (cronData.type !== "daily") return; const times = [...cronData.times]; times[idx] = { ...times[idx], [field]: value }; setCronData({ ...cronData, times }); }

  // --- Weekly helpers ---
  function toggleDay(day: DayKey) { if (cronData.type !== "weekly") return; const days = { ...cronData.days }; if (days[day]) { delete days[day]; } else { days[day] = [{ h: 9, m: 0, s: 0 }]; } setCronData({ ...cronData, days }); }
  function addWeeklySlot(day: DayKey) { if (cronData.type !== "weekly") return; const days = { ...cronData.days }; days[day] = [...(days[day] || []), { h: 12, m: 0, s: 0 }]; setCronData({ ...cronData, days }); }
  function removeWeeklySlot(day: DayKey, idx: number) { if (cronData.type !== "weekly") return; const days = { ...cronData.days }; const slots = [...(days[day] || [])]; if (slots.length <= 1) return; days[day] = slots.filter((_, i) => i !== idx); setCronData({ ...cronData, days }); }
  function updateWeeklySlot(day: DayKey, idx: number, field: keyof TimeSlot, value: number) { if (cronData.type !== "weekly") return; const days = { ...cronData.days }; const slots = [...(days[day] || [])]; slots[idx] = { ...slots[idx], [field]: value }; days[day] = slots; setCronData({ ...cronData, days }); }

  function handleSave() {
    setError("");
    setSuccess(false);
    startTransition(async () => {
      const result = await updateColumnSettings(columnId, {
        automationType,
        aiProvider: aiProvider || null,
        aiModel: aiModel || null,
        cronEnabled,
        cronExpr: cronEnabled ? JSON.stringify(cronData) : null,
        cronTimezone: cronEnabled ? cronTimezone : null,
        apiKey: apiKey || null,
        webhook: webhook || null,
        prompt: prompt || null,
        automationStatus,
        openclawUrl: openclawUrl || null,
        openclawApiKey: openclawApiKey || null,
        openclawPermissions: automationType === "openclaw" ? openclawPerms : null,
      });
      if (result.error) { setError(result.error); } else { setSuccess(true); setTimeout(() => setSuccess(false), 2000); }
    });
  }

  const labelCls = "block text-xs font-medium text-gray-500 mb-1";
  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white";
  const selectCls = inputCls;
  const tabBtn = (active: boolean) => `px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${active ? "bg-teal-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`;

  function renderTimeSlotRow(slot: TimeSlot, onUpdate: (f: keyof TimeSlot, v: number) => void, onRemove: (() => void) | null) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-1 bg-white rounded-lg border border-gray-200 px-2 py-1.5">
          <input type="number" min={0} max={23} value={slot.h} onChange={(e) => onUpdate("h", parseInt(e.target.value) || 0)} className="w-10 text-center text-sm border-0 focus:outline-none bg-transparent" />
          <span className="text-gray-400 text-sm font-bold">:</span>
          <input type="number" min={0} max={59} value={slot.m} onChange={(e) => onUpdate("m", parseInt(e.target.value) || 0)} className="w-10 text-center text-sm border-0 focus:outline-none bg-transparent" />
          <span className="text-gray-400 text-sm font-bold">:</span>
          <input type="number" min={0} max={59} value={slot.s} onChange={(e) => onUpdate("s", parseInt(e.target.value) || 0)} className="w-10 text-center text-sm border-0 focus:outline-none bg-transparent" />
          <span className="text-[10px] text-gray-400 ml-1">HH:MM:SS</span>
        </div>
        {onRemove && (<button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>)}
      </div>
    );
  }

  function renderCronSchedule() {
    return (
      <div className="bg-gray-50 rounded-lg p-3 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCronData({ type: "daily", times: [{ h: 9, m: 0, s: 0 }] })} className={tabBtn(cronData.type === "daily")}>ทุกวัน</button>
          <button onClick={() => setCronData(cronData.type === "weekly" ? cronData : defaultWeekly())} className={tabBtn(cronData.type === "weekly")}>เลือกวัน</button>
          <button onClick={() => setCronData({ type: "interval", every: 30, unit: "minutes" })} className={tabBtn(cronData.type === "interval")}>Loop</button>
        </div>

        {cronData.type === "daily" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">รันทุกวัน ตามเวลาที่กำหนด</p>
            {cronData.times.map((slot, idx) => (<div key={idx}>{renderTimeSlotRow(slot, (f, v) => updateDailySlot(idx, f, v), cronData.times.length > 1 ? () => removeDailySlot(idx) : null)}</div>))}
            <button onClick={addDailySlot} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium"><Plus size={12} /> เพิ่มช่วงเวลา</button>
          </div>
        )}

        {cronData.type === "weekly" && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">เลือกวันที่ต้องการ แล้วกำหนดเวลาแยกแต่ละวัน</p>
            <div className="flex gap-1">
              {DAYS_OF_WEEK.map((d) => {
                const active = !!cronData.days[d.key];
                return (<button key={d.key} onClick={() => toggleDay(d.key)} title={d.full} className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${active ? "bg-teal-600 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"}`}>{d.label}</button>);
              })}
            </div>
            {DAYS_OF_WEEK.filter((d) => cronData.days[d.key]).map((d) => {
              const slots = cronData.days[d.key] || [];
              return (
                <div key={d.key} className="bg-white rounded-lg border border-gray-200 p-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">{d.full}</span>
                    <button onClick={() => addWeeklySlot(d.key)} className="flex items-center gap-0.5 text-[10px] text-teal-600 hover:text-teal-800 font-medium"><Plus size={10} /> เพิ่ม</button>
                  </div>
                  <div className="space-y-1.5">{slots.map((slot, idx) => (<div key={idx}>{renderTimeSlotRow(slot, (f, v) => updateWeeklySlot(d.key, idx, f, v), slots.length > 1 ? () => removeWeeklySlot(d.key, idx) : null)}</div>))}</div>
                </div>
              );
            })}
            {Object.keys(cronData.days).length === 0 && <p className="text-xs text-gray-400 text-center py-2">กดเลือกวันด้านบนเพื่อกำหนดเวลา</p>}
          </div>
        )}

        {cronData.type === "interval" && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">รันวนซ้ำตามรอบที่กำหนด</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">ทุก</span>
              <input type="number" min={1} max={cronData.unit === "hours" ? 24 : 1440} value={cronData.every} onChange={(e) => setCronData({ ...cronData, every: parseInt(e.target.value) || 1 })} className="w-20 px-2 py-1.5 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white" />
              <select value={cronData.unit} onChange={(e) => setCronData({ ...cronData, unit: e.target.value as "minutes" | "hours" })} className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white">
                <option value="minutes">นาที</option>
                <option value="hours">ชั่วโมง</option>
              </select>
            </div>
            <p className="text-[11px] text-gray-400">{cronData.unit === "minutes" ? `= รัน ${Math.floor(1440 / cronData.every)} ครั้ง/วัน` : `= รัน ${Math.floor(24 / cronData.every)} ครั้ง/วัน`}</p>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200">
          <label className={labelCls}>Timezone</label>
          <select value={cronTimezone} onChange={(e) => setCronTimezone(e.target.value)} className={selectCls}>{TIMEZONES.map((tz) => (<option key={tz} value={tz}>{tz}</option>))}</select>
        </div>
      </div>
    );
  }

  const activePermsCount = ALL_PERM_KEYS.filter((k) => openclawPerms[k]).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 shrink-0">
          <Bot size={18} className="text-indigo-600" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-800">Stage Settings</h3>
            <p className="text-xs text-gray-400 truncate">{columnTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center"><div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Status */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Power size={16} className={automationStatus === "run" ? "text-green-600" : "text-gray-400"} />
                <span className="text-sm font-medium text-gray-700">Automation Status</span>
              </div>
              <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                <button onClick={() => setAutomationStatus("run")} className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${automationStatus === "run" ? "bg-green-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>Run</button>
                <button onClick={() => setAutomationStatus("pause")} className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${automationStatus === "pause" ? "bg-orange-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}>Pause</button>
              </div>
            </div>

            {/* Automation Type Toggle */}
            <div>
              <label className={labelCls}>Automation Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAutomationType("ai_config")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-colors ${
                    automationType === "ai_config" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Bot size={16} />
                  <span className="text-sm font-medium">AI Config</span>
                </button>
                <button
                  onClick={() => setAutomationType("openclaw")}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-colors ${
                    automationType === "openclaw" ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Zap size={16} />
                  <span className="text-sm font-medium">Agent</span>
                </button>
              </div>
            </div>

            {/* AI Config Mode */}
            {automationType === "ai_config" && (
              <>
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Bot size={14} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">AI Configuration</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Provider</label>
                      <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} className={selectCls}>
                        {AI_PROVIDERS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>AI Model</label>
                      <input type="text" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="e.g. gpt-4o, claude-3.5-sonnet" className={inputCls} />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Key size={14} className="text-amber-500" /><span className="text-sm font-semibold text-gray-700">API Key</span></div>
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className={inputCls} />
                </div>
              </>
            )}

            {/* Agent Mode */}
            {automationType === "openclaw" && (
              <>
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Zap size={14} className="text-orange-500" />
                    <span className="text-sm font-semibold text-gray-700">Agent Connection</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Webhook URL</label>
                      <div className="flex gap-1.5">
                        <input type="text" value={openclawUrl} readOnly className={`${inputCls} bg-gray-50 text-gray-600 text-xs flex-1`} />
                        <button onClick={() => copyToClipboard(openclawUrl, "url")} title="Copy" className={`px-2.5 py-2 rounded-lg border transition-colors shrink-0 ${copied === "url" ? "bg-green-50 border-green-300 text-green-600" : "border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}>
                          <Copy size={14} />
                        </button>
                        <button onClick={regenerateWebhook} title="Regenerate" className="px-2.5 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0">
                          <RefreshCw size={14} />
                        </button>
                      </div>
                      {copied === "url" && <span className="text-[10px] text-green-600 mt-0.5">Copied!</span>}
                    </div>
                    <div>
                      <label className={labelCls}>Agent Prompt Guide</label>
                      <div className="flex gap-1.5">
                        <div className={`${inputCls} bg-gray-50 text-xs flex-1 flex items-center gap-1.5 text-blue-600 cursor-pointer hover:text-blue-800`} onClick={() => window.open(`${window.location.origin}/api/v1/agent/agent-prompt`, "_blank")}>
                          <FileText size={12} />
                          <span className="truncate">agent_prompt.md</span>
                          <ExternalLink size={10} className="shrink-0 ml-auto opacity-50" />
                        </div>
                        <button
                          onClick={() => {
                            copyToClipboard(AGENT_PROMPT_CONTENT.replace(/\{WEBHOOK_URL\}/g, openclawUrl), "prompt");
                          }}
                          title="Copy prompt (with Webhook URL filled in)"
                          className={`px-2.5 py-2 rounded-lg border transition-colors shrink-0 ${copied === "prompt" ? "bg-green-50 border-green-300 text-green-600" : "border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      {copied === "prompt" && <span className="text-[10px] text-green-600 mt-0.5">Copied! (Webhook URL filled in)</span>}
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Shield size={14} className="text-violet-500" />
                      <span className="text-sm font-semibold text-gray-700">Permissions</span>
                      <span className="text-[10px] text-gray-400 ml-1">{activePermsCount}/{ALL_PERM_KEYS.length}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setAllPerms(true)} className="text-[10px] text-teal-600 hover:text-teal-800 font-medium px-1.5 py-0.5 rounded hover:bg-teal-50">เลือกทั้งหมด</button>
                      <button onClick={() => setAllPerms(false)} className="text-[10px] text-gray-500 hover:text-gray-700 font-medium px-1.5 py-0.5 rounded hover:bg-gray-100">ล้าง</button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {OPENCLAW_PERMS.map((group) => (
                      <div key={group.group} className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.group}</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {group.items.map((item) => (
                            <label key={item.key} className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={!!openclawPerms[item.key]}
                                onChange={() => togglePerm(item.key)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                              />
                              <span className="text-xs text-gray-600 group-hover:text-gray-800">{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* AI Config only: Webhook, Schedule, Prompt */}
            {automationType === "ai_config" && (
              <>
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Globe size={14} className="text-blue-500" /><span className="text-sm font-semibold text-gray-700">Webhook URL</span></div>
                  <input type="url" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://..." className={inputCls} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5"><Clock size={14} className="text-teal-500" /><span className="text-sm font-semibold text-gray-700">Schedule</span></div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-gray-500">{cronEnabled ? "Enabled" : "Disabled"}</span>
                      <button onClick={() => setCronEnabled(!cronEnabled)} className={`w-9 h-5 rounded-full transition-colors relative ${cronEnabled ? "bg-teal-600" : "bg-gray-300"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cronEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </label>
                  </div>
                  {cronEnabled && renderCronSchedule()}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-2"><FileText size={14} className="text-purple-500" /><span className="text-sm font-semibold text-gray-700">Prompt</span></div>
                  <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Enter AI prompt for this stage..." rows={5} className={`${inputCls} resize-y`} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 shrink-0">
          <div className="text-sm">
            {error && <span className="text-red-600">{error}</span>}
            {success && <span className="text-green-600">Saved!</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">Close</button>
            <button onClick={handleSave} disabled={isPending} className="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40">{isPending ? "Saving..." : "Save Settings"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
