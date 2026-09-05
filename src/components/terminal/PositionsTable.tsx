"use client";

import type { Position } from "@/lib/terminal-store";
import Sparkline from "./Sparkline";

export default function PositionsTable({ positions }: { positions: Position[] }) {
  return (
    <div className="jt-panel flex h-full min-h-[200px] flex-col overflow-hidden">
      <div className="jt-panel-title">ACTIVE POSITIONS</div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="jt-table w-full">
          <thead>
            <tr>
              <th>Token</th>
              <th>Bought</th>
              <th>Sold</th>
              <th>Rem</th>
              <th>PnL</th>
              <th>Trend</th>
              <th>Opened</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p, idx) => (
              <tr key={p.id} className="jt-row">
                <td className="font-semibold text-slate-100">{p.token}</td>
                <td className="jt-green">${p.bought.toFixed(2)}</td>
                <td className="jt-red">{p.sold ? `$${p.sold.toFixed(2)}` : "—"}</td>
                <td className="text-slate-400">{p.remaining}</td>
                <td className={p.pnlPct >= 0 ? "jt-green" : "jt-red"}>
                  {p.pnlPct >= 0 ? "+" : ""}
                  {p.pnlPct.toFixed(1)}%
                </td>
                <td>
                  <Sparkline
                    seed={10 + idx}
                    width={72}
                    height={22}
                    color={p.pnlPct >= 0 ? "#22c55e" : "#f43f5e"}
                  />
                </td>
                <td className="text-slate-500">{p.openedAgo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
