"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, CheckCircle2, Clock, AlertTriangle, XCircle, Activity, Trash2, FlaskConical } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

type Equipment = {
  id: number; equipment_id: string; name: string; type: string;
  department: string; location: string; manufacturer: string; model: string;
  serial_number: string; installation_date: string; status: string;
  requalification_frequency: string; requalification_tolerance: string;
  next_due_date: string; notes: string;
};
type Qualification = { id: number; phase: string; protocol_number: string; execution_date: string; approval_date: string; approved_by: string; status: string; remarks: string; };
type AuditEntry = { id: number; action: string; details: string; changed_by: string; created_at: string; };

const PHASE_INFO: Record<string, { full: string; desc: string }> = {
  DQ: { full: "Design Qualification",       desc: "Documented verification that proposed design meets requirements" },
  IQ: { full: "Installation Qualification", desc: "Verified that equipment is installed correctly per manufacturer specs" },
  OQ: { full: "Operational Qualification",  desc: "Equipment functions within operational specifications under controlled conditions" },
  PQ: { full: "Performance Qualification",  desc: "Equipment performs consistently under real-world production conditions" },
};

const STATUS_OPTIONS = ["Pending", "In Progress", "Passed", "Failed", "Waived"];

const QUAL_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  Passed:      { bg: "--qbadge-pass-bg", text: "--qbadge-pass-text", border: "--qbadge-pass-border" },
  Failed:      { bg: "--qbadge-fail-bg", text: "--qbadge-fail-text", border: "--qbadge-fail-border" },
  "In Progress": { bg: "--qbadge-prog-bg", text: "--qbadge-prog-text", border: "--qbadge-prog-border" },
  Pending:     { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" },
  Waived:      { bg: "--qbadge-waiv-bg", text: "--qbadge-waiv-text", border: "--qbadge-waiv-border" },
};

const EQUIP_STATUS: Record<string, { bg: string; text: string; icon: React.ComponentType<{ size?: number }> }> = {
  Qualified:            { bg: "--badge-qual-bg", text: "--badge-qual-text", icon: CheckCircle2 },
  "In Progress":        { bg: "--badge-prog-bg", text: "--badge-prog-text", icon: Activity },
  "Not Started":        { bg: "--badge-none-bg", text: "--badge-none-text", icon: Clock },
  Overdue:              { bg: "--badge-over-bg", text: "--badge-over-text", icon: XCircle },
  Failed:               { bg: "--badge-fail-bg", text: "--badge-fail-text", icon: AlertTriangle },
  "Requalification Due":{ bg: "--badge-warn-bg", text: "--badge-warn-text", icon: AlertTriangle },
};

const PHASE_DOT: Record<string, string> = { Passed: "#3fb950", Failed: "#f85149", "In Progress": "#58a6ff", Pending: "var(--border)" };

export default function EquipmentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Equipment>>({});
  const [editQuals, setEditQuals] = useState<Qualification[]>([]);
  const [activeTab, setActiveTab] = useState<"qualification" | "details" | "audit">("qualification");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/equipment/${id}`);
      const data = await res.json();
      setEquipment(data.equipment);
      setQualifications(data.qualifications);
      setAuditLog(data.auditLog);
      setEditForm(data.equipment);
      setEditQuals(data.qualifications);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/equipment/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editForm, qualifications: editQuals }) });
      setEditing(false);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await fetch(`/api/equipment/${id}`, { method: "DELETE" });
    router.push("/");
  };

  const updateQual = (qualId: number, field: string, value: string) =>
    setEditQuals((prev) => prev.map((q) => (q.id === qualId ? { ...q, [field]: value } : q)));

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg focus:outline-none";
  const inputStyle = { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" };
  const surfaceStyle = { background: "var(--bg-surface)", border: "1px solid var(--border)" };
  const labelStyle = { color: "var(--text-muted)" };

  if (loading) return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }} className="flex items-center justify-center">
      <div style={{ borderColor: "var(--spinner-track)", borderTopColor: "var(--spinner-head)" }} className="w-6 h-6 border-2 rounded-full animate-spin" />
    </div>
  );

  if (!equipment) return (
    <div style={{ background: "var(--bg-base)", color: "var(--text-muted)", minHeight: "100vh" }} className="flex items-center justify-center text-sm">Equipment not found.</div>
  );

  const eqStatus = EQUIP_STATUS[equipment.status] || EQUIP_STATUS["Not Started"];
  const StatusIcon = eqStatus.icon;

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }} className="sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} style={{ color: "var(--text-muted)" }}
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity">
              <ArrowLeft size={15} /> Back
            </button>
            <div style={{ background: "var(--border)" }} className="w-px h-5" />
            <div className="flex items-center gap-3">
              <div style={{ background: "var(--text-primary)" }} className="w-8 h-8 rounded-lg flex items-center justify-center">
                <FlaskConical size={16} style={{ color: "var(--bg-surface)" }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 style={{ color: "var(--text-primary)" }} className="text-sm font-semibold">{equipment.name}</h1>
                  <span style={{ background: "var(--bg-tag)", color: "var(--text-tag)" }} className="text-xs font-mono font-semibold px-2 py-0.5 rounded">{equipment.equipment_id}</span>
                </div>
                <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">{equipment.department} · {equipment.location}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ background: `var(${eqStatus.bg})`, color: `var(${eqStatus.text})` }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium">
              <StatusIcon size={13} /> {equipment.status}
            </span>
            <ThemeToggle />
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setEditForm(equipment); setEditQuals(qualifications); }}
                  style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg hover:opacity-80 transition-opacity">
                  <X size={14} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg hover:opacity-80 transition-opacity">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  style={{ color: "var(--badge-over-text)", border: "1px solid var(--badge-over-border)", background: "var(--badge-over-bg)" }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg hover:opacity-80 transition-opacity">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} className="flex gap-1 rounded-xl p-1 mb-6 w-fit">
          {(["qualification", "details", "audit"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={activeTab === tab
                ? { background: "var(--text-primary)", color: "var(--bg-surface)" }
                : { color: "var(--text-muted)", background: "transparent" }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all">
              {tab === "qualification" ? "Qualification Phases" : tab === "details" ? "Equipment Details" : "Audit Log"}
            </button>
          ))}
        </div>

        {/* Qualification Phases */}
        {activeTab === "qualification" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(editing ? editQuals : qualifications).map((qual) => {
              const info = PHASE_INFO[qual.phase];
              const qb = QUAL_BADGE[qual.status] || QUAL_BADGE["Pending"];
              return (
                <div key={qual.id} style={surfaceStyle} className="rounded-xl overflow-hidden">
                  <div style={{ borderBottom: "1px solid var(--border-light)" }} className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color: "var(--text-muted)" }} className="text-xs font-bold uppercase tracking-widest">{qual.phase}</span>
                      <span style={{ background: `var(${qb.bg})`, color: `var(${qb.text})`, borderColor: `var(${qb.border})` }}
                        className="text-xs px-2 py-0.5 rounded-md border font-medium">{qual.status}</span>
                    </div>
                    <p style={{ color: "var(--text-primary)" }} className="text-sm font-semibold">{info?.full}</p>
                    <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5 leading-relaxed">{info?.desc}</p>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    {editing ? (
                      <>
                        <div>
                          <label style={labelStyle} className="block text-xs font-medium mb-1">Status</label>
                          <select value={qual.status} onChange={(e) => updateQual(qual.id, "status", e.target.value)} style={inputStyle} className={inputCls}>
                            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "Protocol No.", field: "protocol_number", placeholder: "e.g. EQ-IQ-001" },
                            { label: "Approved By", field: "approved_by", placeholder: "Name" },
                          ].map(({ label, field, placeholder }) => (
                            <div key={field}>
                              <label style={labelStyle} className="block text-xs font-medium mb-1">{label}</label>
                              <input value={(qual as unknown as Record<string, string>)[field] || ""} onChange={(e) => updateQual(qual.id, field, e.target.value)}
                                style={inputStyle} className={inputCls} placeholder={placeholder} />
                            </div>
                          ))}
                          {[
                            { label: "Execution Date", field: "execution_date" },
                            { label: "Approval Date", field: "approval_date" },
                          ].map(({ label, field }) => (
                            <div key={field}>
                              <label style={labelStyle} className="block text-xs font-medium mb-1">{label}</label>
                              <input type="date" value={(qual as unknown as Record<string, string>)[field] || ""} onChange={(e) => updateQual(qual.id, field, e.target.value)}
                                style={inputStyle} className={inputCls} />
                            </div>
                          ))}
                        </div>
                        <div>
                          <label style={labelStyle} className="block text-xs font-medium mb-1">Remarks</label>
                          <textarea value={qual.remarks || ""} onChange={(e) => updateQual(qual.id, "remarks", e.target.value)} rows={2}
                            style={inputStyle} className={`${inputCls} resize-none`} placeholder="Observations, deviations..." />
                        </div>
                      </>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <Detail label="Protocol No." value={qual.protocol_number} />
                        <Detail label="Approved By" value={qual.approved_by} />
                        <Detail label="Execution Date" value={qual.execution_date ? new Date(qual.execution_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                        <Detail label="Approval Date" value={qual.approval_date ? new Date(qual.approval_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                        {qual.remarks && (
                          <div className="col-span-2">
                            <p style={labelStyle} className="text-xs font-medium mb-0.5">Remarks</p>
                            <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed">{qual.remarks}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Equipment Details */}
        {activeTab === "details" && (
          <div style={surfaceStyle} className="rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              {editing ? (
                <>
                  {[
                    { label: "Equipment Name", key: "name" }, { label: "Type", key: "type" },
                    { label: "Department", key: "department" }, { label: "Location", key: "location" },
                    { label: "Manufacturer", key: "manufacturer" }, { label: "Model", key: "model" },
                    { label: "Serial Number", key: "serial_number" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label style={labelStyle} className="block text-xs font-medium mb-1.5">{label}</label>
                      <input value={(editForm as Record<string, string>)[key] || ""} onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                        style={inputStyle} className={inputCls} />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle} className="block text-xs font-medium mb-1.5">Installation Date</label>
                    <input type="date" value={editForm.installation_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, installation_date: e.target.value }))}
                      style={inputStyle} className={inputCls} />
                  </div>
                  <div>
                    <label style={labelStyle} className="block text-xs font-medium mb-1.5">Requalification Frequency</label>
                    <select value={editForm.requalification_frequency || "Annual"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_frequency: e.target.value }))}
                      style={inputStyle} className={inputCls}>
                      <option value="Annual">Annual (Every 1 Year)</option>
                      <option value="Every 2 Years">Every 2 Years</option>
                      <option value="Every 5 Years">Every 5 Years</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} className="block text-xs font-medium mb-1.5">Tolerance Window</label>
                    <select value={editForm.requalification_tolerance || "1"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_tolerance: e.target.value }))}
                      style={inputStyle} className={inputCls}>
                      <option value="1">± 1 Month</option>
                      <option value="2">± 2 Months</option>
                      <option value="3">± 3 Months</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} className="block text-xs font-medium mb-1.5">Next Due Date</label>
                    <input type="date" value={editForm.next_due_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, next_due_date: e.target.value }))}
                      style={inputStyle} className={inputCls} />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <label style={labelStyle} className="block text-xs font-medium mb-1.5">Notes</label>
                    <textarea value={editForm.notes || ""} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                      style={inputStyle} className={`${inputCls} resize-none`} />
                  </div>
                </>
              ) : (
                <>
                  <Detail label="Equipment ID" value={equipment.equipment_id} mono />
                  <Detail label="Equipment Name" value={equipment.name} />
                  <Detail label="Type" value={equipment.type} />
                  <Detail label="Department" value={equipment.department} />
                  <Detail label="Location" value={equipment.location} />
                  <Detail label="Manufacturer" value={equipment.manufacturer} />
                  <Detail label="Model" value={equipment.model} />
                  <Detail label="Serial Number" value={equipment.serial_number} />
                  <Detail label="Installation Date" value={equipment.installation_date ? new Date(equipment.installation_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                  <Detail label="Requalification Frequency" value={equipment.requalification_frequency} />
                  <Detail label="Tolerance Window" value={equipment.requalification_tolerance ? `± ${equipment.requalification_tolerance} Month${equipment.requalification_tolerance === "1" ? "" : "s"}` : "± 1 Month"} />
                  <Detail label="Next Due Date" value={equipment.next_due_date ? new Date(equipment.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                  {equipment.notes && (
                    <div className="col-span-2 md:col-span-3">
                      <p style={labelStyle} className="text-xs font-medium mb-1">Notes</p>
                      <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed">{equipment.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Audit Log */}
        {activeTab === "audit" && (
          <div style={surfaceStyle} className="rounded-xl overflow-hidden">
            {auditLog.length === 0 ? (
              <div style={{ color: "var(--text-muted)" }} className="py-16 text-center text-sm">No audit entries yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                    {["Date & Time", "Action", "Details", "Changed By"].map((h) => (
                      <th key={h} style={{ color: "var(--text-muted)" }} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry, i) => (
                    <tr key={entry.id} style={{ borderBottom: i === auditLog.length - 1 ? "none" : "1px solid var(--border-light)" }}>
                      <td style={{ color: "var(--text-muted)" }} className="px-5 py-3 text-xs whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ color: "var(--text-primary)" }} className="px-5 py-3 text-sm font-medium">{entry.action}</td>
                      <td style={{ color: "var(--text-secondary)" }} className="px-5 py-3 text-sm">{entry.details || "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }} className="px-5 py-3 text-sm">{entry.changed_by || "System"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} className="relative rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 style={{ color: "var(--text-primary)" }} className="text-base font-semibold mb-2">Delete Equipment?</h3>
            <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-5">
              This will permanently delete <strong>{equipment.name}</strong> and all qualification records. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                className="px-4 py-2 text-sm rounded-lg hover:opacity-80 transition-opacity">Cancel</button>
              <button onClick={handleDelete}
                style={{ background: "var(--badge-over-text)", color: "#ffffff" }}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <p style={{ color: "var(--text-muted)" }} className="text-xs font-medium mb-0.5">{label}</p>
      <p style={{ color: mono ? "var(--text-tag)" : "var(--text-primary)" }} className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>
        {value || <span style={{ color: "var(--text-subtle)" }}>—</span>}
      </p>
    </div>
  );
}
