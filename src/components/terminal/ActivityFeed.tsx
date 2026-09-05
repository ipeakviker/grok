"use client";

import type { ActivityItem } from "@/lib/terminal-store";

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="jt-panel flex h-full min-h-[200px] flex-col overflow-hidden">
      <div className="jt-panel-title">
        <span>Activity</span>
        <span className="jt-badge jt-badge--live">
          <span className="jt-dot jt-dot-live" />
          LIVE
        </span>
      </div>
      <div className="jt-scroll min-h-0 flex-1 space-y-0.5 p-2 font-mono text-xs">
        {items.slice(0, 40).map((a) => (
          <div key={a.id} className="jt-row flex items-center gap-2 rounded-md px-2 py-1.5">
            <span className={`jt-num w-10 ${a.type === "Buy" ? "jt-green" : "jt-red"}`}>{a.type}</span>
            <span className="w-12 font-semibold text-slate-100">{a.token}</span>
            <span className="jt-num flex-1 text-slate-400">{a.amount}</span>
            <span className="jt-num text-slate-500">{a.mcap}</span>
            <span className="jt-num w-10 text-right text-slate-600">{a.age}</span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="jt-empty">
            <div className="jt-empty__icon">∅</div>
            <p>Нет сделок</p>
          </div>
        )}
      </div>
    </div>
  );
}
