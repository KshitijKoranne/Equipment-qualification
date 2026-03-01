"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, CheckCircle2, CheckCircle, Clock, AlertTriangle, XCircle, Activity, Trash2, FlaskConical, Wrench, Plus, ChevronDown, ChevronUp, Tag } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AttachmentPanel from "@/components/AttachmentPanel";

type Equipment = {
  id: number; equipment_id: string; name: string; type: string;
  department: string; location: string; manufacturer: string; model: string;
  serial_number: string; installation_date: string; status: string;
  requalification_frequency: string; requalification_tolerance: string;
  next_due_date: string; notes: string;
  change_control_number: string; urs_number: string; urs_approval_date: string; capacity: string;
};
type Qualification = {
  id: number; phase: string; protocol_number: string; execution_date: string;
  approval_date: string; approved_by: string; status: string; remarks: string;
};
type AuditEntry = { id: number; action: string; details: string; changed_by: string; created_at: string; };

type RevalidationPhase = { id: number; breakdown_id: number; phase: string; protocol_number: string; execution_date: string; approval_date: string; approved_by: string; status: string; remarks: string; };
type Requalification = {
  id: number; equipment_id: number; requalification_ref: string; frequency: string;
  tolerance_months: string; scheduled_date: string; execution_date: string;
  protocol_number: string; approval_date: string; approved_by: string;
  status: string; remarks: string;
};
type History = {
  id: number; equipment_id: number; breakdown_ref: string; reported_date: string; reported_by: string;
  description: string; root_cause: string; breakdown_type: string; severity: string;
  maintenance_start: string; maintenance_end: string; maintenance_performed_by: string; maintenance_details: string;
  validation_impact: string; impact_assessment: string; status: string;
  closure_date: string; closed_by: string; closure_remarks: string;
  revalidation_phases: RevalidationPhase[];
};

const PHASE_INFO: Record<string, { full: string; desc: string }> = {
  URS:              { full: "User Requirement Specification", desc: "Documents what the user requires the equipment to do — the foundation of all qualification activities" },
  DQ:               { full: "Design Qualification",          desc: "Documented verification that the proposed design meets URS and regulatory requirements" },
  FAT:              { full: "Factory Acceptance Testing",  desc: "Testing performed at the manufacturer's facility before shipment to verify equipment meets design specifications" },
  SAT:              { full: "Site Acceptance Testing",     desc: "Testing performed after installation at the user's site to confirm equipment functions correctly in its actual environment" },
  IQ:               { full: "Installation Qualification",    desc: "Verified that equipment is installed correctly per manufacturer specs and approved drawings" },
  OQ:               { full: "Operational Qualification",     desc: "Equipment functions within operational specifications under controlled conditions including worst-case" },
  PQ:               { full: "Performance Qualification",     desc: "Equipment performs consistently under real-world production conditions using actual materials" },
};

const PHASE_ORDER = ["URS", "DQ", "FAT", "SAT", "IQ", "OQ", "PQ"];
const STATUS_OPTIONS = ["Pending", "In Progress", "Passed", "Failed", "Waived", "Not Applicable"];

const QUAL_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  Passed:           { bg: "--qbadge-pass-bg", text: "--qbadge-pass-text", border: "--qbadge-pass-border" },
  Failed:           { bg: "--qbadge-fail-bg", text: "--qbadge-fail-text", border: "--qbadge-fail-border" },
  "In Progress":    { bg: "--qbadge-prog-bg", text: "--qbadge-prog-text", border: "--qbadge-prog-border" },
  Pending:          { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" },
  Waived:           { bg: "--qbadge-waiv-bg", text: "--qbadge-waiv-text", border: "--qbadge-waiv-border" },
  "Not Applicable": { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" },
};

const EQUIP_STATUS: Record<string, { bg: string; text: string; icon: React.ComponentType<{ size?: number }> }> = {
  Qualified:              { bg: "--badge-qual-bg", text: "--badge-qual-text", icon: CheckCircle2 },
  "In Progress":          { bg: "--badge-prog-bg", text: "--badge-prog-text", icon: Activity },
  "Not Started":          { bg: "--badge-none-bg", text: "--badge-none-text", icon: Clock },
  Overdue:                { bg: "--badge-over-bg", text: "--badge-over-text", icon: XCircle },
  Failed:                 { bg: "--badge-fail-bg", text: "--badge-fail-text", icon: AlertTriangle },
  "Requalification Due":   { bg: "--badge-warn-bg",  text: "--badge-warn-text",  icon: AlertTriangle },
  "Under Maintenance":     { bg: "--badge-maint-bg", text: "--badge-maint-text", icon: Activity },
  "Revalidation Required": { bg: "--badge-reval-bg", text: "--badge-reval-text", icon: AlertTriangle },
};

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
  const [activeTab, setActiveTab] = useState<"qualification" | "details" | "equipment-history" | "audit">("qualification");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [requalifications, setRequalifications] = useState<Requalification[]>([]);
  const [histories, setHistories] = useState<History[]>([]);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<number | null>(null);
  const [editingHistory, setEditingHistory] = useState<number | null>(null);
  const [historyEdit, setHistoryEdit] = useState<Partial<History>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/equipment/${id}`);
      const data = await res.json();
      setEquipment(data.equipment);
      // Sort qualifications by PHASE_ORDER
      const sorted = [...data.qualifications].sort(
        (a: Qualification, b: Qualification) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)
      );
      setQualifications(sorted);
      setAuditLog(data.auditLog);
      setEditForm(data.equipment);
      setEditQuals(sorted);
      // Fetch equipment histories
      const bdRes = await fetch(`/api/breakdowns/${id}`);
      setHistories(await bdRes.json());
      // Fetch requalifications
      const rqRes = await fetch(`/api/requalifications?equipment_id=${id}`);
      setRequalifications(await rqRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [newlyAssignedId, setNewlyAssignedId] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<number | null>(null); // qual.id being edited
  const [phaseEditForm, setPhaseEditForm] = useState<Partial<Qualification>>({});
  const [phaseSaving, setPhaseSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, qualifications: editQuals }),
      });
      const data = await res.json();
      // Show banner if Equipment ID was auto-assigned on DQ completion
      if (data.equipment_id && (!equipment?.equipment_id || equipment.equipment_id.startsWith("PENDING-"))) {
        setNewlyAssignedId(data.equipment_id);
        setTimeout(() => setNewlyAssignedId(null), 8000);
      }
      setEditing(false);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  // Save a single qualification phase individually
  const savePhase = async (qualId: number) => {
    setPhaseSaving(true);
    try {
      const updatedQual = { ...qualifications.find(q => q.id === qualId), ...phaseEditForm };
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, qualifications: [updatedQual] }),
      });
      const data = await res.json();
      if (data.equipment_id && (!equipment?.equipment_id || equipment.equipment_id.startsWith("PENDING-"))) {
        setNewlyAssignedId(data.equipment_id);
        setTimeout(() => setNewlyAssignedId(null), 8000);
      }
      setEditingPhase(null);
      setPhaseEditForm({});
      fetchData();
    } catch (e) { console.error(e); }
    finally { setPhaseSaving(false); }
  };

  // A phase is "done" (unlocks next) when it has any status other than Pending
  const isDone = (status: string) => status !== "Pending";

  const handleDelete = async () => {    await fetch(`/api/equipment/${id}`, { method: "DELETE" });
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
  const displayQuals = editing ? editQuals : qualifications;

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
                  {equipment.equipment_id && !equipment.equipment_id.startsWith('PENDING-') && (
                    <span style={{ background: "var(--bg-tag)", color: "var(--text-tag)" }} className="text-xs font-mono font-semibold px-2 py-0.5 rounded">{equipment.equipment_id}</span>
                  )}
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
            {activeTab !== "qualification" && (editing ? (
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
              <button onClick={() => setEditing(true)}
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg hover:opacity-80 transition-opacity">
                <Edit2 size={14} /> Edit
              </button>
            ))}
            <button onClick={() => setShowDeleteConfirm(true)}
              style={{ color: "var(--badge-over-text)", border: "1px solid var(--badge-over-border)", background: "var(--badge-over-bg)" }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg hover:opacity-80 transition-opacity">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }} className="flex gap-1 rounded-xl p-1 mb-6 w-fit">
          {(["qualification", "details", "equipment-history", "audit"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={activeTab === tab
                ? { background: "var(--text-primary)", color: "var(--bg-surface)" }
                : { color: "var(--text-muted)", background: "transparent" }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all">
              {tab === "qualification" ? "Qualification Phases" : tab === "details" ? "Equipment Details" : tab === "equipment-history" ? "Equipment History" : "Audit Log"}
            </button>
          ))}
        </div>

        {/* Equipment ID assigned banner */}
        {newlyAssignedId && (
          <div style={{ background: "var(--badge-pass-bg)", border: "1px solid var(--badge-pass-border)", color: "var(--badge-pass-text)" }}
            className="rounded-xl px-5 py-3.5 mb-4 flex items-center gap-3">
            <CheckCircle size={16} className="flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold">Equipment ID assigned: </span>
              <span className="text-sm font-mono font-bold">{newlyAssignedId}</span>
              <span className="text-xs ml-2 opacity-75">— auto-generated on DQ completion</span>
            </div>
          </div>
        )}

        {/* Qualification Phases */}
        {activeTab === "qualification" && (
          <>
            {/* Phase progress strip */}
            <div style={surfaceStyle} className="rounded-xl p-4 mb-6 overflow-x-auto">
              <div className="flex items-center gap-0 min-w-max">
                {PHASE_ORDER.map((phase, idx) => {
                  const qual = displayQuals.find((q) => q.phase === phase);
                  const status = qual?.status || "Pending";
                  const dotColor = status === "Passed" ? "#3fb950" : status === "Failed" ? "#f85149" : status === "In Progress" ? "#58a6ff" : status === "Waived" ? "#c084fc" : "var(--border)";
                  return (
                    <div key={phase} className="flex items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div style={{ background: dotColor, width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {status === "Passed" && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                          {status === "Failed" && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✗</span>}
                          {(status === "Pending" || status === "Not Applicable") && <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700 }}>{idx + 1}</span>}
                          {status === "In Progress" && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>…</span>}
                          {status === "Waived" && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>W</span>}
                        </div>
                        <span style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 600 }}>{phase}</span>
                      </div>
                      {idx < PHASE_ORDER.length - 1 && (
                        <div style={{ height: 2, width: 32, background: status === "Passed" ? "#3fb950" : "var(--border)", marginBottom: 16 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase cards — 2 columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {displayQuals.map((qual, phaseIdx) => {
                const info = PHASE_INFO[qual.phase];
                const qb = QUAL_BADGE[qual.status] || QUAL_BADGE["Pending"];
                const prevQual = phaseIdx > 0 ? displayQuals[phaseIdx - 1] : null;
                const isLocked = prevQual !== null && !isDone(prevQual.status);
                const isEditingThis = editingPhase === qual.id;
                const ef = isEditingThis ? phaseEditForm : {};
                const fieldVal = (field: string) => (ef as Record<string,string>)[field] ?? (qual as unknown as Record<string,string>)[field] ?? "";

                return (
                  <div key={qual.id} style={{ ...surfaceStyle, opacity: isLocked ? 0.5 : 1, position: "relative" }} className="rounded-xl overflow-hidden">

                    {/* Lock overlay */}
                    {isLocked && (
                      <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--bg-surface)", opacity: 0.85, borderRadius: 12 }}>
                        <span style={{ fontSize: 22 }}>🔒</span>
                        <p style={{ color: "var(--text-muted)" }} className="text-xs mt-2 font-medium">Complete {prevQual?.phase} first</p>
                      </div>
                    )}

                    {/* Phase header */}
                    <div style={{ borderBottom: "1px solid var(--border-light)" }} className="px-5 py-4 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span style={{ color: "var(--text-muted)" }} className="text-xs font-bold uppercase tracking-widest">{qual.phase}</span>
                          <span style={{ background: `var(${qb.bg})`, color: `var(${qb.text})`, borderColor: `var(${qb.border})` }}
                            className="text-xs px-2 py-0.5 rounded-md border font-medium">{qual.status}</span>
                        </div>
                        <p style={{ color: "var(--text-primary)" }} className="text-sm font-semibold">{info?.full}</p>
                        <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5 leading-relaxed">{info?.desc}</p>
                      </div>
                      {/* Per-tile edit button */}
                      {!isLocked && !isEditingThis && (
                        <button onClick={() => { setEditingPhase(qual.id); setPhaseEditForm({ ...qual }); }}
                          style={{ color: "var(--text-muted)", border: "1px solid var(--border)", flexShrink: 0 }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 mt-0.5">
                          <Edit2 size={11} /> Edit
                        </button>
                      )}
                      {isEditingThis && (
                        <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                          <button onClick={() => { setEditingPhase(null); setPhaseEditForm({}); }}
                            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
                            className="px-2.5 py-1.5 rounded-lg text-xs hover:opacity-80">Cancel</button>
                          <button onClick={() => savePhase(qual.id)} disabled={phaseSaving}
                            style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">
                            <Save size={11} /> {phaseSaving ? "…" : "Save"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Phase fields */}
                    <div className="px-5 py-4 space-y-3">
                      {isEditingThis ? (
                        <>
                          <div>
                            <label style={labelStyle} className="block text-xs font-medium mb-1">Status</label>
                            <select value={fieldVal("status")} onChange={(e) => setPhaseEditForm(p => ({ ...p, status: e.target.value }))} style={inputStyle} className={inputCls}>
                              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: "Protocol No.", field: "protocol_number", placeholder: `e.g. EQ-${qual.phase}-001` },
                              { label: "Approved By",  field: "approved_by",     placeholder: "Name" },
                            ].map(({ label, field, placeholder }) => (
                              <div key={field}>
                                <label style={labelStyle} className="block text-xs font-medium mb-1">{label}</label>
                                <input value={fieldVal(field)} onChange={(e) => setPhaseEditForm(p => ({ ...p, [field]: e.target.value }))}
                                  style={inputStyle} className={inputCls} placeholder={placeholder} />
                              </div>
                            ))}
                            {[
                              { label: "Execution Date", field: "execution_date" },
                              { label: "Approval Date",  field: "approval_date" },
                            ].map(({ label, field }) => (
                              <div key={field}>
                                <label style={labelStyle} className="block text-xs font-medium mb-1">{label}</label>
                                <input type="date" value={fieldVal(field)} onChange={(e) => setPhaseEditForm(p => ({ ...p, [field]: e.target.value }))}
                                  style={inputStyle} className={inputCls} />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label style={labelStyle} className="block text-xs font-medium mb-1">Remarks</label>
                            <textarea value={fieldVal("remarks")} onChange={(e) => setPhaseEditForm(p => ({ ...p, remarks: e.target.value }))} rows={2}
                              style={inputStyle} className={`${inputCls} resize-none`} placeholder="Observations, deviations..." />
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <Detail label="Protocol No." value={qual.protocol_number} />
                          <Detail label="Approved By"  value={qual.approved_by} />
                          <Detail label="Execution Date" value={qual.execution_date ? new Date(qual.execution_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                          <Detail label="Approval Date"  value={qual.approval_date  ? new Date(qual.approval_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                          {qual.remarks && (
                            <div className="col-span-2">
                              <p style={labelStyle} className="text-xs font-medium mb-0.5">Remarks</p>
                              <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed">{qual.remarks}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Attachments — always visible */}
                    <AttachmentPanel qualificationId={qual.id} />

                    {/* DQ: Equipment ID hint */}
                    {qual.phase === "DQ" && (!equipment.equipment_id || equipment.equipment_id.startsWith("PENDING-")) && (
                      <div style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-surface-2)" }} className="px-5 py-3 flex items-center gap-2">
                        <Tag size={13} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
                        <p style={{ color: "var(--text-muted)" }} className="text-xs">
                          Equipment ID will be auto-generated when DQ status is set to <strong>Passed</strong> and saved.
                        </p>
                      </div>
                    )}

                    {/* OQ: requalification frequency */}
                    {qual.phase === "OQ" && (
                      <div style={{ borderTop: "1px solid var(--border-light)" }} className="px-5 py-4">
                        <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Requalification Frequency</p>
                        {isEditingThis ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label style={{ color: "var(--text-muted)" }} className="block text-xs font-medium mb-1.5">Frequency</label>
                              <select value={editForm.requalification_frequency || "Annual"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_frequency: e.target.value }))} style={inputStyle} className={inputCls}>
                                <option value="Annual">Annual (Every 1 Year)</option>
                                <option value="Every 2 Years">Every 2 Years</option>
                                <option value="Every 5 Years">Every 5 Years</option>
                              </select>
                            </div>
                            <div>
                              <label style={{ color: "var(--text-muted)" }} className="block text-xs font-medium mb-1.5">Tolerance Window</label>
                              <select value={editForm.requalification_tolerance || "1"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_tolerance: e.target.value }))} style={inputStyle} className={inputCls}>
                                <option value="1">± 1 Month</option>
                                <option value="2">± 2 Months</option>
                                <option value="3">± 3 Months</option>
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-6">
                            <Detail label="Frequency" value={equipment?.requalification_frequency || "—"} />
                            <Detail label="Tolerance Window" value={equipment?.requalification_tolerance ? `± ${equipment.requalification_tolerance} Month${equipment.requalification_tolerance === "1" ? "" : "s"}` : "—"} />
                          </div>
                        )}
                        <p style={{ color: "var(--text-muted)" }} className="text-xs mt-2">Set during OQ — defines how often this equipment must be requalified.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Requalifications — multiple events over equipment lifetime */}
            <RequalificationsSection
              equipmentId={Number(id)}
              requalifications={requalifications}
              onRefresh={fetchData}
              surfaceStyle={surfaceStyle}
              inputStyle={inputStyle}
              inputCls={inputCls}
              labelStyle={{ color: "var(--text-muted)" }}
            />
          </>
        )}

        {/* Equipment Details */}
        {activeTab === "details" && (
          <div className="space-y-5">
            {/* Section: Change Control & URS */}
            <Section title="Change Control & URS Reference" surfaceStyle={surfaceStyle}>
              {editing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                  {[
                    { label: "Change Control Number", key: "change_control_number", placeholder: "e.g. CC-2024-001" },
                    { label: "URS Reference Number",  key: "urs_number",            placeholder: "e.g. URS-HPLC-001" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={labelStyle} className="block text-xs font-medium mb-1.5">{label}</label>
                      <input value={(editForm as Record<string, string>)[key] || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                        style={inputStyle} className={inputCls} placeholder={placeholder} />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle} className="block text-xs font-medium mb-1.5">URS Approval Date</label>
                    <input type="date" value={editForm.urs_approval_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, urs_approval_date: e.target.value }))} style={inputStyle} className={inputCls} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <Detail label="Change Control Number" value={equipment.change_control_number} mono />
                  <Detail label="URS Reference Number"  value={equipment.urs_number} mono />
                  <Detail label="URS Approval Date"     value={equipment.urs_approval_date ? new Date(equipment.urs_approval_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                </div>
              )}
            </Section>

            {/* Section: Equipment Identification */}
            <Section title="Equipment Identification" surfaceStyle={surfaceStyle}>
              {editing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                  {[
                    { label: "Equipment ID (Tag No.)", key: "equipment_id", placeholder: "Added after procurement e.g. HPLC-001" },
                    { label: "Equipment Name",         key: "name",         placeholder: "" },
                    { label: "Type",                   key: "type",         placeholder: "" },
                    { label: "Department",             key: "department",   placeholder: "" },
                    { label: "Location",               key: "location",     placeholder: "" },
                    { label: "Capacity",               key: "capacity",     placeholder: "e.g. 500L, 0–300°C" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={labelStyle} className="block text-xs font-medium mb-1.5">{label}</label>
                      <input value={(editForm as Record<string, string>)[key] || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                        style={inputStyle} className={inputCls} placeholder={placeholder} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <Detail label="Equipment ID (Tag No.)" value={equipment.equipment_id?.startsWith('PENDING-') ? null : equipment.equipment_id} mono />
                  {(!equipment.equipment_id || equipment.equipment_id.startsWith('PENDING-')) && (
                    <div>
                      <p style={labelStyle} className="text-xs font-medium mb-1">Equipment ID (Tag No.)</p>
                      <p style={{ color: "var(--text-muted)" }} className="text-xs italic">Auto-assigned when DQ is approved</p>
                    </div>
                  )}
                  <Detail label="Equipment Name"         value={equipment.name} />
                  <Detail label="Type"                   value={equipment.type} />
                  <Detail label="Department"             value={equipment.department} />
                  <Detail label="Location"               value={equipment.location} />
                  <Detail label="Capacity"               value={equipment.capacity} />
                </div>
              )}
            </Section>

            {/* Section: Technical Details */}
            <Section title="Technical Details" surfaceStyle={surfaceStyle}>
              {editing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                  {[
                    { label: "Manufacturer",   key: "manufacturer",   placeholder: "e.g. Agilent" },
                    { label: "Model",          key: "model",          placeholder: "e.g. 1260 Infinity" },
                    { label: "Serial Number",  key: "serial_number",  placeholder: "e.g. SN-12345" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={labelStyle} className="block text-xs font-medium mb-1.5">{label}</label>
                      <input value={(editForm as Record<string, string>)[key] || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                        style={inputStyle} className={inputCls} placeholder={placeholder} />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle} className="block text-xs font-medium mb-1.5">Installation Date</label>
                    <input type="date" value={editForm.installation_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, installation_date: e.target.value }))} style={inputStyle} className={inputCls} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <Detail label="Manufacturer"      value={equipment.manufacturer} />
                  <Detail label="Model"             value={equipment.model} />
                  <Detail label="Serial Number"     value={equipment.serial_number} mono />
                  <Detail label="Installation Date" value={equipment.installation_date ? new Date(equipment.installation_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                </div>
              )}
            </Section>

          </div>
        )}

        {/* Equipment History Tab */}
        {activeTab === "equipment-history" && (
          <EquipmentHistoryTab
            equipmentId={Number(id)}
            histories={histories}
            showForm={showHistoryForm}
            setShowForm={setShowHistoryForm}
            expandedHistory={expandedHistory}
            setExpandedHistory={setExpandedHistory}
            editingHistory={editingHistory}
            setEditingHistory={setEditingHistory}
            historyEdit={historyEdit}
            setHistoryEdit={setHistoryEdit}
            onRefresh={fetchData}
            surfaceStyle={surfaceStyle}
            inputStyle={inputStyle}
            inputCls={inputCls}
            labelStyle={labelStyle}
          />
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

// ─── Requalifications Section ────────────────────────────────────────────────
const RQ_STATUS_OPTIONS = ["Scheduled", "In Progress", "Passed", "Failed"];
const RQ_FREQ_OPTIONS = ["Annual", "Every 2 Years", "Every 5 Years"];
const RQ_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Scheduled:    { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" },
  "In Progress":{ bg: "--qbadge-prog-bg", text: "--qbadge-prog-text", border: "--qbadge-prog-border" },
  Passed:       { bg: "--qbadge-pass-bg", text: "--qbadge-pass-text", border: "--qbadge-pass-border" },
  Failed:       { bg: "--qbadge-fail-bg", text: "--qbadge-fail-text", border: "--qbadge-fail-border" },
};

function RequalificationsSection({ equipmentId, requalifications, onRefresh, surfaceStyle, inputStyle, inputCls, labelStyle }:
  { equipmentId: number; requalifications: Requalification[]; onRefresh: () => void; surfaceStyle: React.CSSProperties; inputStyle: React.CSSProperties; inputCls: string; labelStyle: React.CSSProperties }) {

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
          <p style={{ color: "var(--text-subtle)" }} className="text-xs mt-1">Click "Add Requalification" to schedule the first requalification event</p>
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
                  <span style={{ color: "var(--text-muted)" }} className="text-xs">Due: {new Date(rq.scheduled_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
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
                        { label: "Status", key: "status", type: "select", options: RQ_STATUS_OPTIONS },
                        { label: "Frequency", key: "frequency", type: "select", options: RQ_FREQ_OPTIONS },
                        { label: "Tolerance", key: "tolerance_months", type: "select", options: ["1", "2", "3"], labels: ["± 1 Month", "± 2 Months", "± 3 Months"] },
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
                      <Detail label="Scheduled Date" value={rq.scheduled_date ? new Date(rq.scheduled_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                      <Detail label="Execution Date" value={rq.execution_date ? new Date(rq.execution_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                      <Detail label="Approval Date" value={rq.approval_date ? new Date(rq.approval_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
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

function Section({ title, children, surfaceStyle }: { title: string; children: React.ReactNode; surfaceStyle: React.CSSProperties }) {
  return (
    <div style={surfaceStyle} className="rounded-xl overflow-hidden">
      <div style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-surface-2)" }} className="px-6 py-3">
        <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider">{title}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
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

// ─── History Types & Constants ────────────────────────────────────────────
const BREAKDOWN_TYPES = ["Mechanical", "Electrical", "Software/Firmware", "Pneumatic/Hydraulic", "Calibration Failure", "Contamination", "Wear & Tear", "Other"];
const SEVERITY_LEVELS = ["Minor", "Moderate", "Major", "Critical"];
const VALIDATION_IMPACTS = ["No Impact", "Partial Revalidation Required", "Full Revalidation Required"];
const REVALIDATION_PHASE_OPTIONS = ["IQ", "OQ", "PQ"];
const BD_STATUS_OPTIONS = ["Open", "Under Investigation", "Maintenance In Progress", "Revalidation In Progress", "Closed", "Cancelled"];
const REVAL_STATUS_OPTIONS = ["Pending", "In Progress", "Passed", "Failed"];

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Minor:    { bg: "--badge-none-bg", text: "--badge-none-text", border: "--badge-none-border" },
  Moderate: { bg: "--badge-warn-bg", text: "--badge-warn-text", border: "--badge-warn-border" },
  Major:    { bg: "--badge-fail-bg", text: "--badge-fail-text", border: "--badge-fail-border" },
  Critical: { bg: "--badge-over-bg", text: "--badge-over-text", border: "--badge-over-border" },
};

const BD_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Open:                       { bg: "--badge-over-bg",  text: "--badge-over-text",  border: "--badge-over-border" },
  "Under Investigation":      { bg: "--badge-warn-bg",  text: "--badge-warn-text",  border: "--badge-warn-border" },
  "Maintenance In Progress":  { bg: "--badge-maint-bg", text: "--badge-maint-text", border: "--badge-maint-border" },
  "Revalidation In Progress": { bg: "--badge-reval-bg", text: "--badge-reval-text", border: "--badge-reval-border" },
  Closed:                     { bg: "--badge-qual-bg",  text: "--badge-qual-text",  border: "--badge-qual-border" },
  Cancelled:                  { bg: "--badge-pend-bg",  text: "--badge-pend-text",  border: "--badge-pend-border" },
};

// ─── New History Form ──────────────────────────────────────────────────────
function NewHistoryForm({ equipmentId, onSave, onCancel, surfaceStyle, inputStyle, inputCls, labelStyle }:
  { equipmentId: number; onSave: () => void; onCancel: () => void; surfaceStyle: React.CSSProperties; inputStyle: React.CSSProperties; inputCls: string; labelStyle: React.CSSProperties }) {

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
        {/* Identification */}
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
  {
    bd: History; equipmentId: number; expanded: boolean; onToggle: () => void;
    editing: boolean; onStartEdit: () => void; onCancelEdit: () => void; onSaved: () => void;
    surfaceStyle: React.CSSProperties; inputStyle: React.CSSProperties; inputCls: string; labelStyle: React.CSSProperties;
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
      {/* Card header — always visible */}
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
            Reported: {new Date(bd.reported_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
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
              {/* Maintenance details */}
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
            // View mode
            <div className="px-5 py-5 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                <Detail label="History Type" value={bd.breakdown_type} />
                <Detail label="Root Cause" value={bd.root_cause} />
                <Detail label="Validation Impact" value={bd.validation_impact} />
                <Detail label="Maintenance Start" value={bd.maintenance_start ? new Date(bd.maintenance_start).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
                <Detail label="Maintenance End" value={bd.maintenance_end ? new Date(bd.maintenance_end).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
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
                      const qb = { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" };
                      if (rp.status === "Passed") { qb.bg = "--qbadge-pass-bg"; qb.text = "--qbadge-pass-text"; qb.border = "--qbadge-pass-border"; }
                      else if (rp.status === "Failed") { qb.bg = "--qbadge-fail-bg"; qb.text = "--qbadge-fail-text"; qb.border = "--qbadge-fail-border"; }
                      else if (rp.status === "In Progress") { qb.bg = "--qbadge-prog-bg"; qb.text = "--qbadge-prog-text"; qb.border = "--qbadge-prog-border"; }
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
                    <Detail label="Closure Date" value={bd.closure_date ? new Date(bd.closure_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null} />
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

// ─── Equipment History Tab Container ────────────────────────────────────────────────
function EquipmentHistoryTab({ equipmentId, histories, showForm, setShowForm, expandedHistory, setExpandedHistory, editingHistory, setEditingHistory, historyEdit, setHistoryEdit, onRefresh, surfaceStyle, inputStyle, inputCls, labelStyle }:
  {
    equipmentId: number; histories: History[]; showForm: boolean; setShowForm: (v: boolean) => void;
    expandedHistory: number | null; setExpandedHistory: (v: number | null) => void;
    editingHistory: number | null; setEditingHistory: (v: number | null) => void;
    historyEdit: Partial<History>; setHistoryEdit: (v: Partial<History>) => void;
    onRefresh: () => void; surfaceStyle: React.CSSProperties; inputStyle: React.CSSProperties; inputCls: string; labelStyle: React.CSSProperties;
  }) {

  const open = histories.filter((b) => !["Closed", "Cancelled"].includes(b.status));
  const closed = histories.filter((b) => ["Closed", "Cancelled"].includes(b.status));

  return (
    <div>
      {/* Header bar */}
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

      {/* New history form */}
      {showForm && (
        <NewHistoryForm
          equipmentId={equipmentId}
          onSave={() => { setShowForm(false); onRefresh(); }}
          onCancel={() => setShowForm(false)}
          surfaceStyle={surfaceStyle}
          inputStyle={inputStyle}
          inputCls={inputCls}
          labelStyle={labelStyle}
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
          {/* Active events */}
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

          {/* Closed events */}
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
