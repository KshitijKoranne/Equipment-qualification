"use client";

import { useState } from "react";
import { Plus, X, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Detail } from "@/components/ui";
import AttachmentPanel from "@/components/AttachmentPanel";
import { formatDate } from "@/lib/utils";
import { RQ_STATUS_OPTIONS, RQ_FREQ_OPTIONS, RQ_STATUS_COLORS } from "@/lib/constants";
import type { Requalification, StyleProps } from "@/lib/types";

type Props = StyleProps & {
  equipmentId: number;
  requalifications: Requalification[];
  onRefresh: () => void;
};

export default function RequalificationsSection({ equipmentId, requalifications, onRefresh, surfaceStyle, inputStyle, inputCls, labelStyle }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Requalification>>({});
  const [saving, setSaving] = useState(false);
  const [newForm, setNewForm] = useState({ requalification_ref: "", frequency: "Annual", tolerance_months: "1", scheduled_date: "", protocol_number: "", remarks: "" });

  const setN = (k: string, v: string) => setNewForm(p => ({ ...p, [k]: v }));
  const setE = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  const addRQ = async () => {
    if (!newForm.requalification_ref) return;
    setSaving(true);
    await fetch("/api/requalifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newForm, equipment_id: equipmentId }),
    });
    setSaving(false); setShowForm(false);
    setNewForm({ requalification_ref: "", frequency: "Annual", tolerance_months: "1", scheduled_date: "", protocol_number: "", remarks: "" });
    onRefresh();
  };

  const saveEdit = async (rq: Requalification) => {
    setSaving(true);
    await fetch(`/api/requalifications/${rq.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rq, ...editForm }),
    });
    setSaving(false); setEditing(null); onRefresh();
  };

  const deleteRQ = async (id: number) => {
    await fetch(`/api/requalifications/${id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginTop: 8 }}>
      {/* Header */}
      <div style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)" }} className="px-5 py-3.5 flex items-center justify-between">
        <div>
          <span style={{ color: "var(--text-primary)" }} className="text-sm font-semibold">Requalifications</span>
          <span style={{ color: "var(--text-muted)" }} className="text-xs ml-2">({requalifications.length} event{requalifications.length !== 1 ? "s" : ""})</span>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
          <Plus size={13} /> Add Requalification
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Reference No. *</label>
              <input value={newForm.requalification_ref} onChange={e => setN("requalification_ref", e.target.value)} style={inputStyle} className={inputCls} placeholder="e.g. RQ-001" />
            </div>
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Frequency</label>
              <select value={newForm.frequency} onChange={e => setN("frequency", e.target.value)} style={inputStyle} className={inputCls}>
                {RQ_FREQ_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Tolerance Window</label>
              <select value={newForm.tolerance_months} onChange={e => setN("tolerance_months", e.target.value)} style={inputStyle} className={inputCls}>
                <option value="1">± 1 Month</option>
                <option value="2">± 2 Months</option>
                <option value="3">± 3 Months</option>
              </select>
            </div>
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Scheduled Date</label>
              <input type="date" value={newForm.scheduled_date} onChange={e => setN("scheduled_date", e.target.value)} style={inputStyle} className={inputCls} />
            </div>
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Protocol No.</label>
              <input value={newForm.protocol_number} onChange={e => setN("protocol_number", e.target.value)} style={inputStyle} className={inputCls} placeholder="e.g. RQ-OQ-001" />
            </div>
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Remarks</label>
              <input value={newForm.remarks} onChange={e => setN("remarks", e.target.value)} style={inputStyle} className={inputCls} placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} style={{ color: "var(--text-muted)" }} className="px-3 py-1.5 text-xs hover:opacity-80">Cancel</button>
            <button onClick={addRQ} disabled={saving || !newForm.requalification_ref}
              style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {requalifications.length === 0 && !showForm && (
        <div style={{ background: "var(--bg-surface)" }} className="py-10 text-center">
          <p style={{ color: "var(--text-muted)" }} className="text-sm">No requalifications yet</p>
          <p style={{ color: "var(--text-subtle)" }} className="text-xs mt-1">Click &quot;Add Requalification&quot; to schedule the first requalification event</p>
        </div>
      )}

      {/* List */}
      {requalifications.map((rq, i) => {
        const st = RQ_STATUS_COLORS[rq.status] || RQ_STATUS_COLORS.Scheduled;
        const isExpanded = expanded === rq.id;
        const isEditing = editing === rq.id;
        return (
          <div key={rq.id} style={{ background: "var(--bg-surface)", borderTop: i === 0 && !showForm && requalifications.length > 0 ? "none" : "1px solid var(--border-light)" }}>
            {/* Row header */}
            <div className="px-5 py-3.5 flex items-center gap-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : rq.id)}>
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span style={{ color: "var(--text-primary)" }} className="text-sm font-semibold font-mono">{rq.requalification_ref}</span>
                <span style={{ background: `var(${st.bg})`, color: `var(${st.text})`, borderColor: `var(${st.border})` }}
                  className="text-xs px-2 py-0.5 rounded-md border font-medium">{rq.status}</span>
                <span style={{ color: "var(--text-muted)" }} className="text-xs">{rq.frequency}</span>
                {rq.scheduled_date && (
                  <span style={{ color: "var(--text-muted)" }} className="text-xs">Due: {formatDate(rq.scheduled_date)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={e => { e.stopPropagation(); setEditing(rq.id); setEditForm(rq); setExpanded(rq.id); }}
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium hover:opacity-80">Edit</button>
                <button onClick={e => { e.stopPropagation(); deleteRQ(rq.id); }}
                  style={{ color: "var(--badge-over-text)" }} className="px-2 py-1 text-xs hover:opacity-60"><X size={13} /></button>
                {isExpanded ? <ChevronUp size={14} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />}
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-surface)" }}>
                {isEditing ? (
                  <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Status", key: "status", type: "select" as const, options: RQ_STATUS_OPTIONS },
                        { label: "Frequency", key: "frequency", type: "select" as const, options: RQ_FREQ_OPTIONS },
                        { label: "Tolerance", key: "tolerance_months", type: "select" as const, options: ["1", "2", "3"], labels: ["± 1 Month", "± 2 Months", "± 3 Months"] },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={labelStyle} className="block text-xs font-medium mb-1.5">{f.label}</label>
                          <select value={(editForm as Record<string, string>)[f.key] || ""} onChange={e => setE(f.key, e.target.value)} style={inputStyle} className={inputCls}>
                            {(f.options || []).map((o, i) => <option key={o} value={o}>{f.labels ? f.labels[i] : o}</option>)}
                          </select>
                        </div>
                      ))}
                      {[
                        { label: "Scheduled Date", key: "scheduled_date", type: "date" },
                        { label: "Execution Date", key: "execution_date", type: "date" },
                        { label: "Protocol No.", key: "protocol_number", type: "text", placeholder: "e.g. RQ-OQ-001" },
                        { label: "Approval Date", key: "approval_date", type: "date" },
                        { label: "Approved By", key: "approved_by", type: "text", placeholder: "Name" },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={labelStyle} className="block text-xs font-medium mb-1.5">{f.label}</label>
                          <input type={f.type} value={(editForm as Record<string, string>)[f.key] || ""} onChange={e => setE(f.key, e.target.value)} placeholder={f.placeholder} style={inputStyle} className={inputCls} />
                        </div>
                      ))}
                      <div className="col-span-3">
                        <label style={labelStyle} className="block text-xs font-medium mb-1.5">Remarks</label>
                        <textarea value={editForm.remarks || ""} onChange={e => setE("remarks", e.target.value)} rows={2} style={inputStyle} className={`${inputCls} resize-none`} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditing(null)} style={{ color: "var(--text-muted)" }} className="px-3 py-1.5 text-xs">Cancel</button>
                      <button onClick={() => saveEdit(rq)} disabled={saving}
                        style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
                        className="px-4 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50">
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <div className="grid grid-cols-3 gap-x-8 gap-y-3 mb-4">
                      <Detail label="Protocol No." value={rq.protocol_number} />
                      <Detail label="Scheduled Date" value={formatDate(rq.scheduled_date)} />
                      <Detail label="Execution Date" value={formatDate(rq.execution_date)} />
                      <Detail label="Approval Date" value={formatDate(rq.approval_date)} />
                      <Detail label="Approved By" value={rq.approved_by} />
                      <Detail label="Tolerance" value={rq.tolerance_months ? `± ${rq.tolerance_months} Month${rq.tolerance_months === "1" ? "" : "s"}` : null} />
                      {rq.remarks && <div className="col-span-3"><Detail label="Remarks" value={rq.remarks} /></div>}
                    </div>
                    <AttachmentPanel requalificationId={rq.id} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
