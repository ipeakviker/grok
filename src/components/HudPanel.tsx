"use client";

import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  status?: "live" | "idle" | "warn" | "err";
  statusLabel?: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
  hideWhenOtherExpanded?: boolean;
  anyExpanded?: boolean;
};

export default function HudPanel({
  id,
  title,
  subtitle,
  status,
  statusLabel,
  expanded,
  onExpand,
  onCollapse,
  className = "",
  bodyClassName = "",
  children,
  hideWhenOtherExpanded = true,
  anyExpanded = false,
}: Props) {
  if (hideWhenOtherExpanded && anyExpanded && !expanded) {
    return null;
  }

  const badgeClass =
    status === "live"
      ? "jt-badge jt-badge--live"
      : status === "warn"
        ? "jt-badge jt-badge--warn"
        : status === "err"
          ? "jt-badge jt-badge--err"
          : "jt-badge";

  return (
    <section
      data-panel={id}
      className={`jt-hud-panel flex min-h-0 flex-col overflow-hidden ${
        expanded ? "jt-hud-panel--expanded" : ""
      } ${className}`}
    >
      <span className="jt-hud-corners" aria-hidden />
      <header className="jt-hud-panel__head flex shrink-0 items-center gap-2 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-mono text-[10px] tracking-[0.24em] text-sky-300/95 uppercase">{title}</div>
            {statusLabel ? (
              <span className={badgeClass}>
                {status === "live" || status === "idle" ? (
                  <span className={`jt-dot ${status === "live" ? "jt-dot-live" : ""}`} />
                ) : null}
                {statusLabel}
              </span>
            ) : null}
          </div>
          {subtitle ? <div className="mt-0.5 truncate text-[10px] text-slate-500">{subtitle}</div> : null}
        </div>
        {expanded ? (
          <button
            type="button"
            onClick={onCollapse}
            className="jt-hud-iconbtn"
            title="Свернуть (Esc)"
            aria-label="Свернуть панель"
          >
            ✕
          </button>
        ) : (
          <button
            type="button"
            onClick={onExpand}
            className="jt-hud-iconbtn"
            title="На весь экран"
            aria-label="Развернуть панель"
          >
            ⛶
          </button>
        )}
      </header>
      <div className={`jt-hud-panel__body min-h-0 flex-1 overflow-auto ${bodyClassName}`}>{children}</div>
    </section>
  );
}
