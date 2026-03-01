"use client";

import { useState, useEffect } from "react";
import { Wrench, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Detail } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import {
  BREAKDOWN_TYPES, SEVERITY_LEVELS, VALIDATION_IMPACTS, REVALIDATION_PHASE_OPTIONS,
  BD_STATUS_OPTIONS, REVAL_STATUS_OPTIONS, SEVERITY_COLORS, BD_STATUS_COLORS, QUAL_BADGE,
} from "@/lib/constants";
import type { History, StyleProps } from "@/lib/types";

// ─── New History Form ──────────────────────────────────────────────────────

function NewHistoryForm({ equipmentId, onSave, onCancel, surfaceStyle, inputStyle, inputCls, labelStyle }:
  StyleProps & { equipmentId: number; onSave: () => void; onCancel: () => void }) {

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    breakdown_ref: `BH-${Date.now().toString().slice(-6)}`,
    reported_date: today,
    reported_by: "",
    description: "",
    breakdown_type: "Mechanical",
    severity: "Minor",
    validation_impact: "No Impact",
    impact_assessment: "",
    revalidation_phases: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const togglePhase = (phase: string) => setForm((p) => ({
    ...p,
    revalidation_phases: p.revalidation_phases.includes(phase)
      ? p.revalidation_phases.filter((x) => x !== phase)
      : [...p.revalidation_phases, phase],
  }));

  const submit = async () => {
    if (!form.description) { setError("Description is required."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/breakdowns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, equipment_id: equipmentId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div style={surfaceStyle} className="rounded-xl overflow-hidden mb-6">
      <div style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-surface-2)" }} className="px-5 py-3 flex items-center justify-between">
        <span style={{ color: "var(--text-primary)" }} className="text-sm font-semibold">Log Equipment Event</span>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label style={labelStyle} className="block text-xs font-medium mb-1.5">Reference No.</label>
            <input value={form.breakdown_ref} onChange={(e) => set("breakdown_ref", e.target.value)} style={inputStyle} className={inputCls} placeholder="BH-001" />
          </div>
          <div>
            <label style={labelStyle} className="block text-xs font-medium mb-1.5">Reported Date *</label>
            <input type="date" value={form.reported_date} onChange={(e) => set("reported_date", e.target.value)} style={inputStyle} className={inputCls} />
          </div>
          <div>
            <label style={labelStyle} className="block text-xs font-medium mb-1.5">Reported By</label>
            <input value={form.reported_by} onChange={(e) => set("reported_by", e.target.value)} style={inputStyle} className={inputCls} placeholder="Name" />
          </div>
        </div>
        <div>
          <label style={labelStyle} className="block text-xs font-medium mb-1.5">History Description *</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3}
            style={inputStyle} className={`${inputCls} resize-none`} placeholder="Describe what happened, symptoms observed..." />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label style={labelStyle} className="block text-xs font-medium mb-1.5">History Type</label>
            <select value={form.breakdown_type} onChange={(e) => set("breakdown_type", e.target.value)} style={inputStyle} className={inputCls}>
              {BREAKDOWN_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} className="block text-xs font-medium mb-1.5">Severity</label>
            <select value={form.severity} onChange={(e) => set("severity", e.target.value)} style={inputStyle} className={inputCls}>
              {SEVERITY_LEVELS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle} className="block text-xs font-medium mb-1.5">Validation Impact</label>
            <select value={form.validation_impact} onChange={(e) => set("validation_impact", e.target.value)} style={inputStyle} className={inputCls}>
              {VALIDATION_IMPACTS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
        </div>
        {form.validation_impact !== "No Impact" && (
          <>
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Impact Assessment</label>
              <textarea value={form.impact_assessment} onChange={(e) => set("impact_assessment", e.target.value)} rows={2}
                style={inputStyle} className={`${inputCls} resize-none`} placeholder="Describe which validated parameters may be affected..." />
            </div>
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-2">Revalidation Phases Required</label>
              <div className="flex gap-3">
                {REVALIDATION_PHASE_OPTIONS.map((phase) => (
                  <button key={phase} type="button" onClick={() => togglePhase(phase)}
                    style={{
                      background: form.revalidation_phases.includes(phase) ? "var(--text-primary)" : "var(--bg-surface-2)",
                      color: form.revalidation_phases.includes(phase) ? "var(--bg-surface)" : "var(--text-muted)",
                      border: "1px solid var(--border)",
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all">
                    {phase}
                  </button>
                ))}
              </div>
              <p style={{ color: "var(--text-muted)" }} className="text-xs mt-1.5">Select which qualification phases need to be repeated</p>
            </div>
          </>
        )}
        {error && <p style={{ color: "var(--badge-over-text)" }} className="text-xs">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel} style={{ color: "var(--text-secondary)" }} className="px-4 py-2 text-sm hover:opacity-80 transition-opacity">Cancel</button>
          <button onClick={submit} disabled={saving}
            style={{ background: "var(--badge-over-text)", color: "#fff" }}
            className="px-5 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? "Saving..." : "Log Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Card ───────────────────────────────────────────────────────────

function HistoryCard({ bd, equipmentId, expanded, onToggle, editing, onStartEdit, onCancelEdit, onSaved, surfaceStyle, inputStyle, inputCls, labelStyle }:
  StyleProps & {
    bd: History; equipmentId: number; expanded: boolean; onToggle: () => void;
    editing: boolean; onStartEdit: () => void; onCancelEdit: () => void; onSaved: () => void;
  }) {

  const [form, setForm] = useState<Partial<History>>(bd);
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const setRPField = (rpId: number, field: string, value: string) => {
    setForm((p) => ({
      ...p,
      revalidation_phases: (p.revalidation_phases || []).map((rp) => rp.id === rpId ? { ...rp, [field]: value } : rp),
    }));
  };

  useEffect(() => { setForm(bd); }, [bd]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/breakdowns/${bd.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, equipment_id: equipmentId }),
      });
      onSaved();
      onCancelEdit();
    } finally { setSaving(false); }
  };

  const sevCfg = SEVERITY_COLORS[bd.severity] || SEVERITY_COLORS.Minor;
  const stCfg = BD_STATUS_COLORS[bd.status] || BD_STATUS_COLORS.Open;

  return (
    <div style={surfaceStyle} className="rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-start gap-4 cursor-pointer" onClick={onToggle}>
        <div style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }} className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
          <Wrench size={16} style={{ color: "var(--text-muted)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ color: "var(--text-primary)" }} className="text-sm font-semibold">{bd.breakdown_ref}</span>
            <span style={{ background: `var(${sevCfg.bg})`, color: `var(${sevCfg.text})`, borderColor: `var(${sevCfg.border})` }}
              className="text-xs px-2 py-0.5 rounded-md border font-medium">{bd.severity}</span>
            <span style={{ background: `var(${stCfg.bg})`, color: `var(${stCfg.text})`, borderColor: `var(${stCfg.border})` }}
              className="text-xs px-2 py-0.5 rounded-md border font-medium">{bd.status}</span>
            {bd.validation_impact !== "No Impact" && (
              <span style={{ background: "var(--badge-reval-bg)", color: "var(--badge-reval-text)", borderColor: "var(--badge-reval-border)" }}
                className="text-xs px-2 py-0.5 rounded-md border font-medium">{bd.validation_impact}</span>
            )}
          </div>
          <p style={{ color: "var(--text-secondary)" }} className="text-xs mt-1 truncate">{bd.description}</p>
          <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">
            Reported: {formatDate(bd.reported_date)}
            {bd.reported_by ? ` by ${bd.reported_by}` : ""}
            {bd.breakdown_type ? ` · ${bd.breakdown_type}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <button onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              className="px-2.5 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity">
              Edit
            </button>
          )}
          {expanded ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-light)" }}>
          {editing ? (
            <div className="px-5 py-5 space-y-4">
              <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider">Maintenance Details</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle} className="block text-xs font-medium mb-1.5">Maintenance Start</label>
                  <input type="date" value={form.maintenance_start || ""} onChange={(e) => set("maintenance_start", e.target.value)} style={inputStyle} className={inputCls} />
                </div>
                <div>
                  <label style={labelStyle} className="block text-xs font-medium mb-1.5">Maintenance End</label>
                  <input type="date" value={form.maintenance_end || ""} onChange={(e) => set("maintenance_end", e.target.value)} style={inputStyle} className={inputCls} />
                </div>
                <div>
                  <label style={labelStyle} className="block text-xs font-medium mb-1.5">Performed By</label>
                  <input value={form.maintenance_performed_by || ""} onChange={(e) => set("maintenance_performed_by", e.target.value)} style={inputStyle} className={inputCls} placeholder="Engineer / Vendor" />
                </div>
              </div>
              <div>
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">Root Cause</label>
                <textarea value={form.root_cause || ""} onChange={(e) => set("root_cause", e.target.value)} rows={2}
                  style={inputStyle} className={`${inputCls} resize-none`} placeholder="Root cause identified..." />
              </div>
              <div>
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">Maintenance Details / Actions Taken</label>
                <textarea value={form.maintenance_details || ""} onChange={(e) => set("maintenance_details", e.target.value)} rows={3}
                  style={inputStyle} className={`${inputCls} resize-none`} placeholder="Parts replaced, corrective actions performed..." />
              </div>

              {/* Revalidation phases */}
              {(form.revalidation_phases || []).length > 0 && (
                <>
                  <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider pt-2">Revalidation Phases</p>
                  <div className="space-y-4">
                    {(form.revalidation_phases || []).map((rp) => (
                      <div key={rp.id} style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }} className="rounded-lg p-4">
                        <p style={{ color: "var(--text-primary)" }} className="text-xs font-bold uppercase tracking-widest mb-3">{rp.phase}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label style={labelStyle} className="block text-xs font-medium mb-1">Status</label>
                            <select value={rp.status} onChange={(e) => setRPField(rp.id, "status", e.target.value)} style={inputStyle} className={inputCls}>
                              {REVAL_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle} className="block text-xs font-medium mb-1">Protocol No.</label>
                            <input value={rp.protocol_number || ""} onChange={(e) => setRPField(rp.id, "protocol_number", e.target.value)} style={inputStyle} className={inputCls} placeholder="e.g. RV-OQ-001" />
                          </div>
                          <div>
                            <label style={labelStyle} className="block text-xs font-medium mb-1">Execution Date</label>
                            <input type="date" value={rp.execution_date || ""} onChange={(e) => setRPField(rp.id, "execution_date", e.target.value)} style={inputStyle} className={inputCls} />
                          </div>
                          <div>
                            <label style={labelStyle} className="block text-xs font-medium mb-1">Approved By</label>
                            <input value={rp.approved_by || ""} onChange={(e) => setRPField(rp.id, "approved_by", e.target.value)} style={inputStyle} className={inputCls} placeholder="Name" />
                          </div>
                          <div className="col-span-2">
                            <label style={labelStyle} className="block text-xs font-medium mb-1">Remarks</label>
                            <textarea value={rp.remarks || ""} onChange={(e) => setRPField(rp.id, "remarks", e.target.value)} rows={2}
                              style={inputStyle} className={`${inputCls} resize-none`} placeholder="Observations..." />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Status & Closure */}
              <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider pt-2">Status & Closure</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle} className="block text-xs font-medium mb-1.5">History Status</label>
                  <select value={form.status || "Open"} onChange={(e) => set("status", e.target.value)} style={inputStyle} className={inputCls}>
                    {BD_STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {(form.status === "Closed" || form.status === "Cancelled") && (
                  <>
                    <div>
                      <label style={labelStyle} className="block text-xs font-medium mb-1.5">Closure Date</label>
                      <input type="date" value={form.closure_date || ""} onChange={(e) => set("closure_date", e.target.value)} style={inputStyle} className={inputCls} />
                    </div>
                    <div>
                      <label style={labelStyle} className="block text-xs font-medium mb-1.5">Closed By</label>
                      <input value={form.closed_by || ""} onChange={(e) => set("closed_by", e.target.value)} style={inputStyle} className={inputCls} placeholder="Name" />
                    </div>
                  </>
                )}
              </div>
              {(form.status === "Closed" || form.status === "Cancelled") && (
                <div>
                  <label style={labelStyle} className="block text-xs font-medium mb-1.5">Closure Remarks</label>
                  <textarea value={form.closure_remarks || ""} onChange={(e) => set("closure_remarks", e.target.value)} rows={2}
                    style={inputStyle} className={`${inputCls} resize-none`} placeholder="Closure summary, corrective/preventive actions..." />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button onClick={onCancelEdit} style={{ color: "var(--text-secondary)" }} className="px-4 py-2 text-sm hover:opacity-80 transition-opacity">Cancel</button>
                <button onClick={save} disabled={saving}
                  style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
                  className="px-5 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                <Detail label="History Type" value={bd.breakdown_type} />
                <Detail label="Root Cause" value={bd.root_cause} />
                <Detail label="Validation Impact" value={bd.validation_impact} />
                <Detail label="Maintenance Start" value={formatDate(bd.maintenance_start)} />
                <Detail label="Maintenance End" value={formatDate(bd.maintenance_end)} />
                <Detail label="Performed By" value={bd.maintenance_performed_by} />
              </div>
              {bd.maintenance_details && (
                <div>
                  <p style={{ color: "var(--text-muted)" }} className="text-xs font-medium mb-1">Maintenance Details</p>
                  <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed">{bd.maintenance_details}</p>
                </div>
              )}
              {bd.impact_assessment && (
                <div>
                  <p style={{ color: "var(--text-muted)" }} className="text-xs font-medium mb-1">Impact Assessment</p>
                  <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed">{bd.impact_assessment}</p>
                </div>
              )}
              {bd.revalidation_phases.length > 0 && (
                <div>
                  <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Revalidation Phases</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {bd.revalidation_phases.map((rp) => {
                      const qb = QUAL_BADGE[rp.status] || QUAL_BADGE.Pending;
                      return (
                        <div key={rp.id} style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }} className="rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span style={{ color: "var(--text-primary)" }} className="text-xs font-bold uppercase tracking-widest">{rp.phase}</span>
                            <span style={{ background: `var(${qb.bg})`, color: `var(${qb.text})`, borderColor: `var(${qb.border})` }}
                              className="text-xs px-1.5 py-0.5 rounded border font-medium">{rp.status}</span>
                          </div>
                          <Detail label="Protocol No." value={rp.protocol_number} />
                          <div className="mt-2">
                            <Detail label="Approved By" value={rp.approved_by} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {bd.status === "Closed" && (
                <div style={{ background: "var(--badge-qual-bg)", border: "1px solid var(--badge-qual-border)" }} className="rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <Detail label="Closure Date" value={formatDate(bd.closure_date)} />
                    <Detail label="Closed By" value={bd.closed_by} />
                  </div>
                  {bd.closure_remarks && (
                    <div>
                      <p style={{ color: "var(--text-muted)" }} className="text-xs font-medium mb-1">Closure Remarks</p>
                      <p style={{ color: "var(--text-secondary)" }} className="text-sm">{bd.closure_remarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Equipment History Tab Container ────────────────────────────────────────

type HistoryTabProps = StyleProps & {
  equipmentId: number;
  histories: History[];
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  expandedHistory: number | null;
  setExpandedHistory: (v: number | null) => void;
  editingHistory: number | null;
  setEditingHistory: (v: number | null) => void;
  onRefresh: () => void;
};

export default function EquipmentHistoryTab({
  equipmentId, histories, showForm, setShowForm, expandedHistory, setExpandedHistory,
  editingHistory, setEditingHistory, onRefresh, surfaceStyle, inputStyle, inputCls, labelStyle,
}: HistoryTabProps) {
  const open = histories.filter((b) => !["Closed", "Cancelled"].includes(b.status));
  const closed = histories.filter((b) => ["Closed", "Cancelled"].includes(b.status));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p style={{ color: "var(--text-primary)" }} className="text-sm font-semibold">
            Equipment History & Revalidation Log
          </p>
          <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">
            Track equipment failures, maintenance, and post-maintenance revalidation
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            style={{ background: "var(--badge-over-bg)", color: "var(--badge-over-text)", border: "1px solid var(--badge-over-border)" }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity">
            <Plus size={14} /> Log Event
          </button>
        )}
      </div>

      {showForm && (
        <NewHistoryForm
          equipmentId={equipmentId}
          onSave={() => { setShowForm(false); onRefresh(); }}
          onCancel={() => setShowForm(false)}
          surfaceStyle={surfaceStyle} inputStyle={inputStyle} inputCls={inputCls} labelStyle={labelStyle}
        />
      )}

      {histories.length === 0 && !showForm ? (
        <div style={surfaceStyle} className="rounded-xl py-16 text-center">
          <Wrench size={32} style={{ color: "var(--border)" }} className="mx-auto mb-3" />
          <p style={{ color: "var(--text-muted)" }} className="text-sm font-medium">No equipment history recorded</p>
          <p style={{ color: "var(--text-subtle)" }} className="text-xs mt-1">Report a history when equipment fails or requires unplanned maintenance</p>
        </div>
      ) : (
        <div className="space-y-4">
          {open.length > 0 && (
            <div>
              <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Active ({open.length})</p>
              <div className="space-y-3">
                {open.map((bd) => (
                  <HistoryCard key={bd.id} bd={bd} equipmentId={equipmentId}
                    expanded={expandedHistory === bd.id}
                    onToggle={() => setExpandedHistory(expandedHistory === bd.id ? null : bd.id)}
                    editing={editingHistory === bd.id}
                    onStartEdit={() => { setEditingHistory(bd.id); setExpandedHistory(bd.id); }}
                    onCancelEdit={() => setEditingHistory(null)}
                    onSaved={onRefresh}
                    surfaceStyle={surfaceStyle} inputStyle={inputStyle} inputCls={inputCls} labelStyle={labelStyle}
                  />
                ))}
              </div>
            </div>
          )}
          {closed.length > 0 && (
            <div>
              <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3 mt-4">Closed / Cancelled ({closed.length})</p>
              <div className="space-y-3">
                {closed.map((bd) => (
                  <HistoryCard key={bd.id} bd={bd} equipmentId={equipmentId}
                    expanded={expandedHistory === bd.id}
                    onToggle={() => setExpandedHistory(expandedHistory === bd.id ? null : bd.id)}
                    editing={editingHistory === bd.id}
                    onStartEdit={() => { setEditingHistory(bd.id); setExpandedHistory(bd.id); }}
                    onCancelEdit={() => setEditingHistory(null)}
                    onSaved={onRefresh}
                    surfaceStyle={surfaceStyle} inputStyle={inputStyle} inputCls={inputCls} labelStyle={labelStyle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
