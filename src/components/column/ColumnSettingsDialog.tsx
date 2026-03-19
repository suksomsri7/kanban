"use client";

import { useState, useEffect, useTransition } from "react";
import { X, Bot, Clock, Key, Globe, FileText, Power } from "lucide-react";
import { getColumnSettings, updateColumnSettings } from "@/actions/column";

const AI_PROVIDERS = [
  { value: "", label: "-- Select --" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
];

const TIMEZONES = [
  "Asia/Bangkok",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Pacific/Auckland",
  "UTC",
];

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

  const [aiProvider, setAiProvider] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [cronEnabled, setCronEnabled] = useState(false);
  const [cronType, setCronType] = useState<"daily" | "interval">("daily");
  const [cronHour, setCronHour] = useState("9");
  const [cronMinute, setCronMinute] = useState("0");
  const [cronSecond, setCronSecond] = useState("0");
  const [cronTimezone, setCronTimezone] = useState("Asia/Bangkok");
  const [apiKey, setApiKey] = useState("");
  const [webhook, setWebhook] = useState("");
  const [prompt, setPrompt] = useState("");
  const [automationStatus, setAutomationStatus] = useState("pause");

  useEffect(() => {
    getColumnSettings(columnId).then((data) => {
      if (data) {
        setAiProvider(data.aiProvider || "");
        setAiModel(data.aiModel || "");
        setCronEnabled(data.cronEnabled);
        setCronTimezone(data.cronTimezone || "Asia/Bangkok");
        setApiKey(data.apiKey || "");
        setWebhook(data.webhook || "");
        setPrompt(data.prompt || "");
        setAutomationStatus(data.automationStatus || "pause");

        if (data.cronExpr) {
          parseCronExpr(data.cronExpr);
        }
      }
      setLoading(false);
    });
  }, [columnId]);

  function parseCronExpr(expr: string) {
    const parts = expr.split(" ");
    if (parts.length >= 5) {
      setCronSecond(parts[0] || "0");
      setCronMinute(parts[1] || "0");
      setCronHour(parts[2] || "9");
      if (parts[3] === "*" && parts[4] === "*") {
        setCronType("daily");
      } else {
        setCronType("interval");
      }
    }
  }

  function buildCronExpr() {
    return `${cronSecond} ${cronMinute} ${cronHour} * *`;
  }

  function handleSave() {
    setError("");
    setSuccess(false);

    startTransition(async () => {
      const result = await updateColumnSettings(columnId, {
        aiProvider: aiProvider || null,
        aiModel: aiModel || null,
        cronEnabled,
        cronExpr: cronEnabled ? buildCronExpr() : null,
        cronTimezone: cronEnabled ? cronTimezone : null,
        apiKey: apiKey || null,
        webhook: webhook || null,
        prompt: prompt || null,
        automationStatus,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    });
  }

  const labelCls = "block text-xs font-medium text-gray-500 mb-1";
  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black bg-white";
  const selectCls = inputCls;

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
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Status */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Power size={16} className={automationStatus === "run" ? "text-green-600" : "text-gray-400"} />
                <span className="text-sm font-medium text-gray-700">Automation Status</span>
              </div>
              <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-0.5">
                <button
                  onClick={() => setAutomationStatus("run")}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    automationStatus === "run"
                      ? "bg-green-600 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Run
                </button>
                <button
                  onClick={() => setAutomationStatus("pause")}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    automationStatus === "pause"
                      ? "bg-orange-500 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Pause
                </button>
              </div>
            </div>

            {/* AI Provider & Model */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Bot size={14} className="text-indigo-500" />
                <span className="text-sm font-semibold text-gray-700">AI Configuration</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Provider</label>
                  <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} className={selectCls}>
                    {AI_PROVIDERS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>AI Model</label>
                  <input
                    type="text"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder="e.g. gpt-4o, claude-3.5-sonnet"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Key size={14} className="text-amber-500" />
                <span className="text-sm font-semibold text-gray-700">API Key</span>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className={inputCls}
              />
            </div>

            {/* Webhook */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Globe size={14} className="text-blue-500" />
                <span className="text-sm font-semibold text-gray-700">Webhook URL</span>
              </div>
              <input
                type="url"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </div>

            {/* Cron Job */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-500" />
                  <span className="text-sm font-semibold text-gray-700">Cron Schedule</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-500">{cronEnabled ? "Enabled" : "Disabled"}</span>
                  <button
                    onClick={() => setCronEnabled(!cronEnabled)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      cronEnabled ? "bg-teal-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        cronEnabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>

              {cronEnabled && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCronType("daily")}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                        cronType === "daily" ? "bg-teal-600 text-white" : "bg-white border text-gray-600"
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setCronType("interval")}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                        cronType === "interval" ? "bg-teal-600 text-white" : "bg-white border text-gray-600"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Hour</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={cronHour}
                        onChange={(e) => setCronHour(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Minute</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={cronMinute}
                        onChange={(e) => setCronMinute(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Second</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={cronSecond}
                        onChange={(e) => setCronSecond(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Timezone</label>
                    <select value={cronTimezone} onChange={(e) => setCronTimezone(e.target.value)} className={selectCls}>
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText size={14} className="text-purple-500" />
                <span className="text-sm font-semibold text-gray-700">Prompt</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter AI prompt for this stage..."
                rows={5}
                className={`${inputCls} resize-y`}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 shrink-0">
          <div className="text-sm">
            {error && <span className="text-red-600">{error}</span>}
            {success && <span className="text-green-600">Saved!</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-4 py-2 text-sm text-white bg-black hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
            >
              {isPending ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
