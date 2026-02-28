"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit2, Save, X, CheckCircle2, Clock,
  AlertTriangle, XCircle, Activity, Trash2, FlaskConical
} from "lucide-react";

type Equipment = {
  id: number;
  equipment_id: string;
  name: string;
  type: string;
  department: string;
  location: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  installation_date: string;
  status: string;
  requalification_frequency: string;
  requalification_tolerance: string;
  next_due_date: string;
  notes: string;
};

type Qualification = {
  id: number;
  phase: string;
  protocol_number: string;
  execution_date: string;
  approval_date: string;
  approved_by: string;
  status: string;
  remarks: string;
};

type AuditEntry = {
  id: number;
  action: string;
  details: string;
  changed_by: string;
  created_at: string;
};

const PHASE_INFO: Record<string, { full: string; desc: string }> = {
  DQ: { full: "Design Qualification", desc: "Documented verification that proposed design meets requirements" },
  IQ: { full: "Installation Qualification", desc: "Verified that equipment is installed correctly per manufacturer specs" },
  OQ: { full: "Operational Qualification", desc: "Equipment functions within operational specifications under controlled conditions" },
  PQ: { full: "Performance Qualification", desc: "Equipment performs consistently under real-world production conditions" },
};

const STATUS_OPTIONS = ["Pending", "In Progress", "Passed", "Failed", "Waived"];

const QUAL_STATUS_STYLES: Record<string, string> = {
  Passed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Failed: "bg-red-50 text-red-700 border-red-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Pending: "bg-slate-100 text-slate-500 border-slate-200",
  Waived: "bg-purple-50 text-purple-700 border-purple-200",
};

const EQUIP_STATUS_STYLES: Record<string, string> = {
  Qualified: "bg-emerald-50 text-emerald-700",
  "In Progress": "bg-blue-50 text-blue-700",
  "Not Started": "bg-slate-100 text-slate-600",
  Overdue: "bg-red-50 text-red-700",
  Failed: "bg-orange-50 text-orange-700",
  "Requalification Due": "bg-amber-50 text-amber-700",
};

const EQUIP_STATUS_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  Qualified: CheckCircle2,
  "In Progress": Activity,
  "Not Started": Clock,
  Overdue: XCircle,
  Failed: AlertTriangle,
  "Requalification Due": AlertTriangle,
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, qualifications: editQuals }),
      });
      setEditing(false);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/equipment/${id}`, { method: "DELETE" });
    router.push("/");
  };

  const updateQual = (qualId: number, field: string, value: string) => {
    setEditQuals((prev) =>
      prev.map((q) => (q.id === qualId ? { ...q, [field]: value } : q))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
        Equipment not found.
      </div>
    );
  }

  const StatusIcon = EQUIP_STATUS_ICONS[equipment.status] || Clock;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={15} />
              Back
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <FlaskConical size={16} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-slate-900">{equipment.name}</h1>
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{equipment.equipment_id}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{equipment.department} · {equipment.location}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${EQUIP_STATUS_STYLES[equipment.status] || "bg-slate-100 text-slate-600"}`}>
              <StatusIcon size={13} />
              {equipment.status}
            </div>
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setEditForm(equipment); setEditQuals(qualifications); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors">
                  <X size={14} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50">
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <Edit2 size={14} /> Edit
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 w-fit">
          {(["qualification", "details", "audit"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${activeTab === tab ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
              {tab === "qualification" ? "Qualification Phases" : tab === "details" ? "Equipment Details" : "Audit Log"}
            </button>
          ))}
        </div>

        {/* Qualification Phases Tab */}
        {activeTab === "qualification" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(editing ? editQuals : qualifications).map((qual) => {
              const info = PHASE_INFO[qual.phase];
              return (
                <div key={qual.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{qual.phase}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${QUAL_STATUS_STYLES[qual.status] || QUAL_STATUS_STYLES["Pending"]}`}>
                          {qual.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{info?.full}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{info?.desc}</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    {editing ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                          <select value={qual.status} onChange={(e) => updateQual(qual.id, "status", e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Protocol No.</label>
                            <input value={qual.protocol_number || ""} onChange={(e) => updateQual(qual.id, "protocol_number", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="e.g. EQ-IQ-001" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Approved By</label>
                            <input value={qual.approved_by || ""} onChange={(e) => updateQual(qual.id, "approved_by", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Name" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Execution Date</label>
                            <input type="date" value={qual.execution_date || ""} onChange={(e) => updateQual(qual.id, "execution_date", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Approval Date</label>
                            <input type="date" value={qual.approval_date || ""} onChange={(e) => updateQual(qual.id, "approval_date", e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Remarks</label>
                          <textarea value={qual.remarks || ""} onChange={(e) => updateQual(qual.id, "remarks", e.target.value)} rows={2}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" placeholder="Observations, deviations..." />
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
                            <p className="text-xs font-medium text-slate-500 mb-0.5">Remarks</p>
                            <p className="text-sm text-slate-600 leading-relaxed">{qual.remarks}</p>
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

        {/* Equipment Details Tab */}
        {activeTab === "details" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
              {editing ? (
                <>
                  <EditField label="Equipment Name" value={editForm.name || ""} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} />
                  <EditField label="Type" value={editForm.type || ""} onChange={(v) => setEditForm((p) => ({ ...p, type: v }))} />
                  <EditField label="Department" value={editForm.department || ""} onChange={(v) => setEditForm((p) => ({ ...p, department: v }))} />
                  <EditField label="Location" value={editForm.location || ""} onChange={(v) => setEditForm((p) => ({ ...p, location: v }))} />
                  <EditField label="Manufacturer" value={editForm.manufacturer || ""} onChange={(v) => setEditForm((p) => ({ ...p, manufacturer: v }))} />
                  <EditField label="Model" value={editForm.model || ""} onChange={(v) => setEditForm((p) => ({ ...p, model: v }))} />
                  <EditField label="Serial Number" value={editForm.serial_number || ""} onChange={(v) => setEditForm((p) => ({ ...p, serial_number: v }))} />
                  <EditField label="Installation Date" type="date" value={editForm.installation_date || ""} onChange={(v) => setEditForm((p) => ({ ...p, installation_date: v }))} />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Requalification Frequency</label>
                    <select value={editForm.requalification_frequency || "Annual"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_frequency: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                      <option value="Annual">Annual (Every 1 Year)</option>
                      <option value="Every 2 Years">Every 2 Years</option>
                      <option value="Every 5 Years">Every 5 Years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Tolerance Window</label>
                    <select value={editForm.requalification_tolerance || "1"} onChange={(e) => setEditForm((p) => ({ ...p, requalification_tolerance: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
                      <option value="1">± 1 Month</option>
                      <option value="2">± 2 Months</option>
                      <option value="3">± 3 Months</option>
                    </select>
                  </div>
                  <EditField label="Next Due Date" type="date" value={editForm.next_due_date || ""} onChange={(v) => setEditForm((p) => ({ ...p, next_due_date: v }))} />
                  <div className="col-span-2 md:col-span-3">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
                    <textarea value={editForm.notes || ""} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" />
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
                      <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{equipment.notes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {auditLog.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">No audit entries yet.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Date & Time", "Action", "Details", "Changed By"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry, i) => (
                    <tr key={entry.id} className={`border-b border-slate-50 ${i === auditLog.length - 1 ? "border-b-0" : ""}`}>
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-700">{entry.action}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{entry.details || "—"}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{entry.changed_by || "System"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Delete Equipment?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete <strong>{equipment.name}</strong> and all its qualification records. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
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
      <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
      <p className={`text-sm ${mono ? "font-mono font-semibold text-slate-600" : "text-slate-900 font-medium"}`}>
        {value || <span className="text-slate-400">—</span>}
      </p>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
    </div>
  );
}
