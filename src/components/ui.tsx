"use client";

import { STATUS_CONFIG, PHASE_DOT } from "@/lib/constants";

// ─── Detail (label + value pair) ────────────────────────────────────────────

export function Detail({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p style={{ color: "var(--text-muted)" }} className="text-xs font-medium mb-0.5">{label}</p>
      <p style={{ color: mono ? "var(--text-tag)" : "var(--text-primary)" }} className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {value || <span style={{ color: "var(--text-subtle)" }}>—</span>}
      </p>
    </div>
  );
}

// ─── Section (card with title header) ───────────────────────────────────────

export function Section({ title, children, surfaceStyle }: { title: string; children: React.ReactNode; surfaceStyle: React.CSSProperties }) {
  return (
    <div style={surfaceStyle} className="rounded-xl overflow-hidden">
      <div style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-surface-2)" }} className="px-6 py-3">
        <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── StatusBadge (equipment-level status) ───────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Not Started"];
  return (
    <span
      style={{ background: `var(${cfg.bgVar})`, color: `var(${cfg.textVar})`, borderColor: `var(${cfg.borderVar})` }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border"
    >
      <span style={{ background: cfg.dotBg }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
      {cfg.label}
    </span>
  );
}

// ─── PhaseBar (mini phase progress on dashboard rows) ───────────────────────

export function PhaseBar({ urs, dq, fat, sat, iq, oq, pq }: {
  urs: string; dq: string; fat: string; sat: string; iq: string; oq: string; pq: string;
}) {
  const phases = [
    { label: "URS", status: urs }, { label: "DQ", status: dq }, { label: "FAT", status: fat },
    { label: "SAT", status: sat }, { label: "IQ", status: iq }, { label: "OQ", status: oq },
    { label: "PQ", status: pq },
  ];
  return (
    <div className="flex gap-0.5 items-center">
      {phases.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-0.5">
          <div
            style={{ background: PHASE_DOT[p.status] || "var(--border)" }}
            className="w-5 h-1.5 rounded-sm"
            title={`${p.label}: ${p.status || "Pending"}`}
          />
          <span style={{ color: "var(--text-muted)" }} className="text-[8px] font-semibold">{p.label}</span>
        </div>
      ))}
    </div>
  );
}
