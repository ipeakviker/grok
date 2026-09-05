"use client";

import type { ActivityItem } from "@/lib/terminal-store";

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="jt-panel flex h-full min-h-[200px] flex-col overflow-hidden">
      <div className="jt-panel-title">ACTIVITY</div>
      <div className="min-h-0 flex-1 space-y-1 overflow-auto p-2 font-mono text-xs">
        {items.slice(0, 40).map((a) => (
          <div key={a.id} className="jt-row flex items-center gap-2 rounded px-2 py-1.5">
            <span className={a.type === "Buy" ? "jt-green w-10" : "jt-red w-10"}>{a.type}</span>
            <span className="w-12 font-semibold text-slate-100">{a.token}</span>
            <span className="flex-1 text-slate-400">{a.amount}</span>
            <span className="text-slate-500">{a.mcap}</span>
            <span className="w-10 text-right text-slate-600">{a.age}</span>
          </div>
        ))}
        {items.length === 0 && <p className="p-4 text-center text-slate-600">Нет сделок</p>}
      </div>
    </div>
  );
}
