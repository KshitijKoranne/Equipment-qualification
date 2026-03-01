"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Save, X, CheckCircle, Tag, FlaskConical, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AttachmentPanel from "@/components/AttachmentPanel";
import { Detail, Section } from "@/components/ui";
import RequalificationsSection from "@/components/equipment/RequalificationsSection";
import EquipmentHistoryTab from "@/components/equipment/EquipmentHistoryTab";
import { formatDate, formatDateTime, INPUT_STYLE, SURFACE_STYLE, LABEL_STYLE, INPUT_CLS } from "@/lib/utils";
import { PHASE_ORDER, STATUS_OPTIONS, PHASE_INFO, EQUIP_STATUS, QUAL_BADGE } from "@/lib/constants";
import type { Equipment, Qualification, AuditEntry, Requalification, History } from "@/lib/types";

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

  const [newlyAssignedId, setNewlyAssignedId] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<number | null>(null);
  const [phaseEditForm, setPhaseEditForm] = useState<Partial<Qualification>>({});
  const [phaseSaving, setPhaseSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/equipment/${id}`);
      const data = await res.json();
      setEquipment(data.equipment);
      const sorted = [...data.qualifications].sort(
        (a: Qualification, b: Qualification) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)
      );
      setQualifications(sorted);
      setAuditLog(data.auditLog);
      setEditForm(data.equipment);
      setEditQuals(sorted);
      const bdRes = await fetch(`/api/breakdowns/${id}`);
      setHistories(await bdRes.json());
      const rqRes = await fetch(`/api/requalifications?equipment_id=${id}`);
      setRequalifications(await rqRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, qualifications: editQuals }),
      });
      const data = await res.json();
      if (data.equipment_id && (!equipment?.equipment_id || equipment.equipment_id.startsWith("PENDING-"))) {
        setNewlyAssignedId(data.equipment_id);
        setTimeout(() => setNewlyAssignedId(null), 8000);
      }
      setEditing(false);
      fetchData();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const savePhase = async (qualId: number) => {
    setPhaseSaving(true);
    try {
      const updatedQual = { ...qualifications.find(q => q.id === qualId), ...phaseEditForm };
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
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

  const isDone = (status: string) => status !== "Pending";

  const handleDelete = async () => {
    await fetch(`/api/equipment/${id}`, { method: "DELETE" });
    router.push("/");
  };

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

        {/* ── Qualification Phases Tab ── */}
        {activeTab === "qualification" && (
          <>
            {/* Phase progress strip */}
            <div style={SURFACE_STYLE} className="rounded-xl p-4 mb-6 overflow-x-auto">
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

            {/* Phase cards */}
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
                  <div key={qual.id} style={{ ...SURFACE_STYLE, opacity: isLocked ? 0.5 : 1, position: "relative" }} className="rounded-xl overflow-hidden">
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
                            <label style={LABEL_STYLE} className="block text-xs font-medium mb-1">Status</label>
                            <select value={fieldVal("status")} onChange={(e) => setPhaseEditForm(p => ({ ...p, status: e.target.value }))} style={INPUT_STYLE} className={INPUT_CLS}>
                              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: "Protocol No.", field: "protocol_number", placeholder: `e.g. EQ-${qual.phase}-001` },
                              { label: "Approved By", field: "approved_by", placeholder: "Name" },
                            ].map(({ label, field, placeholder }) => (
                              <div key={field}>
                                <label style={LABEL_STYLE} className="block text-xs font-medium mb-1">{label}</label>
                                <input value={fieldVal(field)} onChange={(e) => setPhaseEditForm(p => ({ ...p, [field]: e.target.value }))}
                                  style={INPUT_STYLE} className={INPUT_CLS} placeholder={placeholder} />
                              </div>
                            ))}
                            {[
                              { label: "Execution Date", field: "execution_date" },
                              { label: "Approval Date", field: "approval_date" },
                            ].map(({ label, field }) => (
                              <div key={field}>
                                <label style={LABEL_STYLE} className="block text-xs font-medium mb-1">{label}</label>
                                <input type="date" value={fieldVal(field)} onChange={(e) => setPhaseEditForm(p => ({ ...p, [field]: e.target.value }))}
                                  style={INPUT_STYLE} className={INPUT_CLS} />
                              </div>
                            ))}
                          </div>
                          <div>
                            <label style={LABEL_STYLE} className="block text-xs font-medium mb-1">Remarks</label>
                            <textarea value={fieldVal("remarks")} onChange={(e) => setPhaseEditForm(p => ({ ...p, remarks: e.target.value }))} rows={2}
                              style={INPUT_STYLE} className={`${INPUT_CLS} resize-none`} placeholder="Observations, deviations..." />
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <Detail label="Protocol No." value={qual.protocol_number} />
                          <Detail label="Approved By" value={qual.approved_by} />
                          <Detail label="Execution Date" value={formatDate(qual.execution_date)} />
                          <Detail label="Approval Date" value={formatDate(qual.approval_date)} />
                          {qual.remarks && (
                            <div className="col-span-2">
                              <p style={LABEL_STYLE} className="text-xs font-medium mb-0.5">Remarks</p>
                              <p style={{ color: "var(--text-secondary)" }} className="text-sm leading-relaxed">{qual.remarks}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <AttachmentPanel qualificationId={qual.id} />

                    {qual.phase === "DQ" && (!equipment.equipment_id || equipment.equipment_id.startsWith("PENDING-")) && (
                      <div style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-surface-2)" }} className="px-5 py-3 flex items-center gap-2">
                        <Tag size={13} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
                        <p style={{ color: "var(--text-muted)" }} className="text-xs">
                          Equipment ID will be auto-generated when DQ status is set to <strong>Passed</strong> and saved.
                        </p>
                      </div>
                    )}

                    {qual.phase === "OQ" && (
                      <div style={{ borderTop: "1px solid var(--border-light)" }} className="px-5 py-4">
                        <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Requalification Frequency</p>
                        {isEditingThis ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label style={LABEL_STYLE} className="block text-xs font-medium mb-1.5">Frequency</label>
                              <select value={editForm.requalification_frequency || "Annual"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_frequency: e.target.value }))} style={INPUT_STYLE} className={INPUT_CLS}>
                                <option value="Annual">Annual (Every 1 Year)</option>
                                <option value="Every 2 Years">Every 2 Years</option>
                                <option value="Every 5 Years">Every 5 Years</option>
                              </select>
                            </div>
                            <div>
                              <label style={LABEL_STYLE} className="block text-xs font-medium mb-1.5">Tolerance Window</label>
                              <select value={editForm.requalification_tolerance || "1"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_tolerance: e.target.value }))} style={INPUT_STYLE} className={INPUT_CLS}>
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

            <RequalificationsSection equipmentId={Number(id)} requalifications={requalifications} onRefresh={fetchData}
              surfaceStyle={SURFACE_STYLE} inputStyle={INPUT_STYLE} inputCls={INPUT_CLS} labelStyle={LABEL_STYLE} />
          </>
        )}

        {/* ── Equipment Details Tab ── */}
        {activeTab === "details" && (
          <div className="space-y-5">
            <Section title="Change Control & URS Reference" surfaceStyle={SURFACE_STYLE}>
              {editing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                  {[
                    { label: "Change Control Number", key: "change_control_number", placeholder: "e.g. CC-2024-001" },
                    { label: "URS Reference Number", key: "urs_number", placeholder: "e.g. URS-HPLC-001" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={LABEL_STYLE} className="block text-xs font-medium mb-1.5">{label}</label>
                      <input value={(editForm as Record<string, string>)[key] || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                        style={INPUT_STYLE} className={INPUT_CLS} placeholder={placeholder} />
                    </div>
                  ))}
                  <div>
                    <label style={LABEL_STYLE} className="block text-xs font-medium mb-1.5">URS Approval Date</label>
                    <input type="date" value={editForm.urs_approval_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, urs_approval_date: e.target.value }))} style={INPUT_STYLE} className={INPUT_CLS} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <Detail label="Change Control Number" value={equipment.change_control_number} mono />
                  <Detail label="URS Reference Number" value={equipment.urs_number} mono />
                  <Detail label="URS Approval Date" value={formatDate(equipment.urs_approval_date)} />
                </div>
              )}
            </Section>

            <Section title="Equipment Identification" surfaceStyle={SURFACE_STYLE}>
              {editing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                  {[
                    { label: "Equipment ID (Tag No.)", key: "equipment_id", placeholder: "Added after procurement e.g. HPLC-001" },
                    { label: "Equipment Name", key: "name", placeholder: "" },
                    { label: "Type", key: "type", placeholder: "" },
                    { label: "Department", key: "department", placeholder: "" },
                    { label: "Location", key: "location", placeholder: "" },
                    { label: "Capacity", key: "capacity", placeholder: "e.g. 500L, 0–300°C" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={LABEL_STYLE} className="block text-xs font-medium mb-1.5">{label}</label>
                      <input value={(editForm as Record<string, string>)[key] || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                        style={INPUT_STYLE} className={INPUT_CLS} placeholder={placeholder} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <Detail label="Equipment ID (Tag No.)" value={equipment.equipment_id?.startsWith('PENDING-') ? null : equipment.equipment_id} mono />
                  {(!equipment.equipment_id || equipment.equipment_id.startsWith('PENDING-')) && (
                    <div>
                      <p style={LABEL_STYLE} className="text-xs font-medium mb-1">Equipment ID (Tag No.)</p>
                      <p style={{ color: "var(--text-muted)" }} className="text-xs italic">Auto-assigned when DQ is approved</p>
                    </div>
                  )}
                  <Detail label="Equipment Name" value={equipment.name} />
                  <Detail label="Type" value={equipment.type} />
                  <Detail label="Department" value={equipment.department} />
                  <Detail label="Location" value={equipment.location} />
                  <Detail label="Capacity" value={equipment.capacity} />
                </div>
              )}
            </Section>

            <Section title="Technical Details" surfaceStyle={SURFACE_STYLE}>
              {editing ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                  {[
                    { label: "Manufacturer", key: "manufacturer", placeholder: "e.g. Agilent" },
                    { label: "Model", key: "model", placeholder: "e.g. 1260 Infinity" },
                    { label: "Serial Number", key: "serial_number", placeholder: "e.g. SN-12345" },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label style={LABEL_STYLE} className="block text-xs font-medium mb-1.5">{label}</label>
                      <input value={(editForm as Record<string, string>)[key] || ""}
                        onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                        style={INPUT_STYLE} className={INPUT_CLS} placeholder={placeholder} />
                    </div>
                  ))}
                  <div>
                    <label style={LABEL_STYLE} className="block text-xs font-medium mb-1.5">Installation Date</label>
                    <input type="date" value={editForm.installation_date || ""} onChange={(e) => setEditForm((p) => ({ ...p, installation_date: e.target.value }))} style={INPUT_STYLE} className={INPUT_CLS} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                  <Detail label="Manufacturer" value={equipment.manufacturer} />
                  <Detail label="Model" value={equipment.model} />
                  <Detail label="Serial Number" value={equipment.serial_number} mono />
                  <Detail label="Installation Date" value={formatDate(equipment.installation_date)} />
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ── Equipment History Tab ── */}
        {activeTab === "equipment-history" && (
          <EquipmentHistoryTab equipmentId={Number(id)} histories={histories}
            showForm={showHistoryForm} setShowForm={setShowHistoryForm}
            expandedHistory={expandedHistory} setExpandedHistory={setExpandedHistory}
            editingHistory={editingHistory} setEditingHistory={setEditingHistory}
            onRefresh={fetchData}
            surfaceStyle={SURFACE_STYLE} inputStyle={INPUT_STYLE} inputCls={INPUT_CLS} labelStyle={LABEL_STYLE} />
        )}

        {/* ── Audit Log Tab ── */}
        {activeTab === "audit" && (
          <div style={SURFACE_STYLE} className="rounded-xl overflow-hidden">
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
                      <td style={{ color: "var(--text-muted)" }} className="px-5 py-3 text-xs whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
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
