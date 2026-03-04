"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Member {
  id: string;
  displayName: string;
}

export interface FilterState {
  search: string;
  assigneeId: string;
  labelId: string;
  priority: string;
}

interface BoardFilterProps {
  labels: Label[];
  members: Member[];
  filter: FilterState;
  onChange: (filter: FilterState) => void;
}

export const emptyFilter: FilterState = {
  search: "",
  assigneeId: "",
  labelId: "",
  priority: "",
};

export default function BoardFilter({
  labels,
  members,
  filter,
  onChange,
}: BoardFilterProps) {
  const [expanded, setExpanded] = useState(false);

  const hasFilters = filter.assigneeId || filter.labelId || filter.priority;
  const hasAny = filter.search || hasFilters;

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={filter.search}
          onChange={(e) => onChange({ ...filter, search: e.target.value })}
          placeholder="Search..."
          className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-32 sm:w-48 focus:outline-none focus:ring-2 focus:ring-black sm:focus:w-64 transition-all bg-white"
        />
      </div>

      {/* Filter Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-lg border transition-colors shrink-0 ${
          hasFilters
            ? "border-black bg-black text-white"
            : "border-gray-200 text-gray-500 hover:border-gray-300"
        }`}
      >
        <Filter size={14} />
        <span className="hidden sm:inline">Filter</span>
      </button>

      {hasAny && (
        <button
          onClick={() => onChange(emptyFilter)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 shrink-0"
        >
          <X size={12} /> <span className="hidden sm:inline">Clear</span>
        </button>
      )}

      {/* Filter Dropdowns */}
      {expanded && (
        <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-2 basis-full sm:basis-auto mt-1 sm:mt-0">
          <select
            value={filter.priority}
            onChange={(e) => onChange({ ...filter, priority: e.target.value })}
            className="px-2 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-white flex-1 sm:flex-none"
          >
            <option value="">Priority</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={filter.labelId}
            onChange={(e) => onChange({ ...filter, labelId: e.target.value })}
            className="px-2 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-white flex-1 sm:flex-none"
          >
            <option value="">Labels</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <select
            value={filter.assigneeId}
            onChange={(e) => onChange({ ...filter, assigneeId: e.target.value })}
            className="px-2 py-1.5 text-xs sm:text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-white flex-1 sm:flex-none"
          >
            <option value="">Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
