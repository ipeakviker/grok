"use client";

import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
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

  return (
    <section
      data-panel={id}
      className={`jt-hud-panel flex min-h-0 flex-col overflow-hidden ${
        expanded ? "jt-hud-panel--expanded" : ""
      } ${className}`}
    >
      <header className="jt-hud-panel__head flex shrink-0 items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] tracking-[0.22em] text-cyan-300/90 uppercase">{title}</div>
          {subtitle ? <div className="truncate text-[10px] text-slate-500">{subtitle}</div> : null}
        </div>
        {expanded ? (
          <button
            type="button"
            onClick={onCollapse}
            className="jt-hud-iconbtn"
            title="Свернуть"
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
