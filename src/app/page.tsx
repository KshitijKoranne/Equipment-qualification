"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Filter, ChevronDown, Activity,
  CheckCircle2, AlertTriangle, Clock, XCircle, FlaskConical
} from "lucide-react";
import AddEquipmentModal from "@/components/AddEquipmentModal";

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
  status: string;
  next_due_date: string;
  dq_status: string;
  iq_status: string;
  oq_status: string;
  pq_status: string;
  created_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; icon: React.ComponentType<{size?: number; className?: string}> }> = {
  Qualified: { label: "Qualified", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: CheckCircle2 },
  "In Progress": { label: "In Progress", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: Activity },
  "Not Started": { label: "Not Started", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", icon: Clock },
  Overdue: { label: "Overdue", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", icon: XCircle },
  Failed: { label: "Failed", color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500", icon: AlertTriangle },
  "Requalification Due": { label: "Requalification Due", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: AlertTriangle },
};

const PHASE_COLOR: Record<string, string> = {
  Passed: "bg-emerald-500",
  Failed: "bg-red-500",
  "In Progress": "bg-blue-500",
  Pending: "bg-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Not Started"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PhaseBar({ dq, iq, oq, pq }: { dq: string; iq: string; oq: string; pq: string }) {
  const phases = [
    { label: "DQ", status: dq },
    { label: "IQ", status: iq },
    { label: "OQ", status: oq },
    { label: "PQ", status: pq },
  ];
  return (
    <div className="flex gap-1 items-center">
      {phases.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-0.5">
          <div className={`w-6 h-1.5 rounded-sm ${PHASE_COLOR[p.status] || "bg-slate-200"}`} title={`${p.label}: ${p.status || "Pending"}`} />
          <span className="text-[9px] text-slate-400 font-medium">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/equipment");
      const data = await res.json();
      setEquipment(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const departments = ["All", ...Array.from(new Set(equipment.map((e) => e.department)))];
  const statuses = ["All", ...Object.keys(STATUS_CONFIG)];

  const filtered = equipment.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.equipment_id.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || e.status === filterStatus;
    const matchDept = filterDept === "All" || e.department === filterDept;
    return matchSearch && matchStatus && matchDept;
  });

  const stats = {
    total: equipment.length,
    qualified: equipment.filter((e) => e.status === "Qualified").length,
    inProgress: equipment.filter((e) => e.status === "In Progress").length,
    overdue: equipment.filter((e) => e.status === "Overdue" || e.status === "Requalification Due").length,
    notStarted: equipment.filter((e) => e.status === "Not Started").length,
  };

  const qualifiedPct = stats.total ? Math.round((stats.qualified / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <FlaskConical size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 leading-none">EQ Tracker</h1>
              <p className="text-xs text-slate-400 mt-0.5">Equipment Qualification System</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <Plus size={15} />
            Add Equipment
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Equipment", value: stats.total, sub: "registered at site", color: "text-slate-900" },
            { label: "Qualified", value: stats.qualified, sub: `${qualifiedPct}% of total`, color: "text-emerald-600" },
            { label: "In Progress", value: stats.inProgress, sub: "qualification ongoing", color: "text-blue-600" },
            { label: "Overdue / Due", value: stats.overdue, sub: "action required", color: "text-red-600" },
            { label: "Not Started", value: stats.notStarted, sub: "pending initiation", color: "text-slate-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-medium text-slate-700 mt-1">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-8 pr-7 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white appearance-none cursor-pointer"
              >
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 pr-7 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white appearance-none cursor-pointer"
              >
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              {filtered.length} equipment{filtered.length !== 1 ? "s" : ""}
              {search || filterStatus !== "All" || filterDept !== "All" ? " (filtered)" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <FlaskConical size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-medium">No equipment found</p>
              <p className="text-xs text-slate-300 mt-1">
                {equipment.length === 0 ? "Add your first equipment to get started" : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Equipment ID", "Name", "Type", "Department", "Location", "Qualification Phases", "Status", "Next Due"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((eq, i) => (
                    <tr
                      key={eq.id}
                      onClick={() => router.push(`/equipment/${eq.id}`)}
                      className={`cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 ${i === filtered.length - 1 ? "border-b-0" : ""}`}
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{eq.equipment_id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-medium text-slate-900">{eq.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{eq.type}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{eq.department}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{eq.location}</td>
                      <td className="px-5 py-3.5">
                        <PhaseBar dq={eq.dq_status} iq={eq.iq_status} oq={eq.oq_status} pq={eq.pq_status} />
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={eq.status} /></td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">
                        {eq.next_due_date ? new Date(eq.next_due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showAddModal && (
        <AddEquipmentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchEquipment(); }}
        />
      )}
    </div>
  );
}
