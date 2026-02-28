"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Filter, ChevronDown, Activity, CheckCircle2, AlertTriangle, Clock, XCircle, FlaskConical } from "lucide-react";
import AddEquipmentModal from "@/components/AddEquipmentModal";
import ThemeToggle from "@/components/ThemeToggle";

type Equipment = {
  id: number; equipment_id: string; name: string; type: string;
  department: string; location: string; status: string;
  next_due_date: string;
  urs_status: string; dq_status: string; fat_status: string; sat_status: string;
  iq_status: string; oq_status: string; pq_status: string; rq_status: string;
};

const STATUS_CONFIG: Record<string, { label: string; bgVar: string; textVar: string; borderVar: string; dotBg: string; icon: React.ComponentType<{ size?: number }> }> = {
  Qualified:           { label: "Qualified",           bgVar: "--badge-qual-bg", textVar: "--badge-qual-text", borderVar: "--badge-qual-border", dotBg: "#3fb950", icon: CheckCircle2 },
  "In Progress":       { label: "In Progress",         bgVar: "--badge-prog-bg", textVar: "--badge-prog-text", borderVar: "--badge-prog-border", dotBg: "#58a6ff", icon: Activity },
  "Not Started":       { label: "Not Started",         bgVar: "--badge-none-bg", textVar: "--badge-none-text", borderVar: "--badge-none-border", dotBg: "#8b949e", icon: Clock },
  Overdue:             { label: "Overdue",              bgVar: "--badge-over-bg", textVar: "--badge-over-text", borderVar: "--badge-over-border", dotBg: "#f85149", icon: XCircle },
  Failed:              { label: "Failed",               bgVar: "--badge-fail-bg", textVar: "--badge-fail-text", borderVar: "--badge-fail-border", dotBg: "#fb8f44", icon: AlertTriangle },
  "Requalification Due":   { label: "Requalification Due",   bgVar: "--badge-warn-bg",  textVar: "--badge-warn-text",  borderVar: "--badge-warn-border",  dotBg: "#e3b341", icon: AlertTriangle },
  "Under Maintenance":     { label: "Under Maintenance",     bgVar: "--badge-maint-bg", textVar: "--badge-maint-text", borderVar: "--badge-maint-border", dotBg: "#a5b4fc", icon: Activity },
  "Revalidation Required": { label: "Revalidation Required", bgVar: "--badge-reval-bg", textVar: "--badge-reval-text", borderVar: "--badge-reval-border", dotBg: "#f9a8d4", icon: AlertTriangle },
};

const PHASE_DOT: Record<string, string> = {
  Passed: "#3fb950", Failed: "#f85149", "In Progress": "#58a6ff", Pending: "var(--border)",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Not Started"];
  return (
    <span style={{ background: `var(${cfg.bgVar})`, color: `var(${cfg.textVar})`, borderColor: `var(${cfg.borderVar})` }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border">
      <span style={{ background: cfg.dotBg }} className="w-1.5 h-1.5 rounded-full flex-shrink-0" />
      {cfg.label}
    </span>
  );
}

function PhaseBar({ urs, dq, fat, sat, iq, oq, pq, rq }: { urs: string; dq: string; fat: string; sat: string; iq: string; oq: string; pq: string; rq: string }) {
  const phases = [
    { label: "URS", status: urs }, { label: "DQ", status: dq }, { label: "FAT", status: fat },
    { label: "SAT", status: sat }, { label: "IQ", status: iq }, { label: "OQ", status: oq },
    { label: "PQ", status: pq }, { label: "RQ", status: rq },
  ];
  return (
    <div className="flex gap-0.5 items-center">
      {phases.map((p) => (
        <div key={p.label} className="flex flex-col items-center gap-0.5">
          <div style={{ background: PHASE_DOT[p.status] || "var(--border)" }} className="w-5 h-1.5 rounded-sm" title={`${p.label}: ${p.status || "Pending"}`} />
          <span style={{ color: "var(--text-muted)" }} className="text-[8px] font-semibold">{p.label}</span>
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
      setEquipment(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const departments = ["All", ...Array.from(new Set(equipment.map((e) => e.department)))];
  const statuses = ["All", ...Object.keys(STATUS_CONFIG)];

  const filtered = equipment.filter((e) => {
    const s = search.toLowerCase();
    return (
      (e.name.toLowerCase().includes(s) || e.equipment_id.toLowerCase().includes(s) || e.department.toLowerCase().includes(s)) &&
      (filterStatus === "All" || e.status === filterStatus) &&
      (filterDept === "All" || e.department === filterDept)
    );
  });

  const stats = {
    total: equipment.length,
    qualified: equipment.filter((e) => e.status === "Qualified").length,
    inProgress: equipment.filter((e) => e.status === "In Progress").length,
    overdue: equipment.filter((e) => e.status === "Overdue" || e.status === "Requalification Due").length,
    notStarted: equipment.filter((e) => e.status === "Not Started").length,
  };
  const qualifiedPct = stats.total ? Math.round((stats.qualified / stats.total) * 100) : 0;

  const inputStyle = { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" };
  const surfaceStyle = { background: "var(--bg-surface)", border: "1px solid var(--border)" };

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }} className="sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{ background: "var(--text-primary)" }} className="w-8 h-8 rounded-lg flex items-center justify-center">
              <FlaskConical size={16} style={{ color: "var(--bg-surface)" }} />
            </div>
            <div>
              <h1 style={{ color: "var(--text-primary)" }} className="text-sm font-semibold leading-none">EQ Tracker</h1>
              <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">Equipment Qualification System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={() => setShowAddModal(true)}
              style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus size={15} /> Add Equipment
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Equipment",  value: stats.total,      sub: "registered at site",    textColor: "var(--text-primary)" },
            { label: "Qualified",        value: stats.qualified,  sub: `${qualifiedPct}% of total`, textColor: "var(--badge-qual-text)" },
            { label: "In Progress",      value: stats.inProgress, sub: "qualification ongoing",  textColor: "var(--badge-prog-text)" },
            { label: "Overdue / Due",    value: stats.overdue,    sub: "action required",         textColor: "var(--badge-over-text)" },
            { label: "Not Started",      value: stats.notStarted, sub: "pending initiation",      textColor: "var(--text-secondary)" },
          ].map((s) => (
            <div key={s.label} style={surfaceStyle} className="rounded-xl p-4">
              <div style={{ color: s.textColor }} className="text-2xl font-bold">{s.value}</div>
              <div style={{ color: "var(--text-secondary)" }} className="text-xs font-medium mt-1">{s.label}</div>
              <div style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={surfaceStyle} className="rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input type="text" placeholder="Search by name, ID or department..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, borderRadius: "0.5rem" }}
              className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2"
              onFocus={(e) => e.target.style.outline = "2px solid var(--focus-ring)"}
              onBlur={(e) => e.target.style.outline = "none"}
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                style={{ ...inputStyle, borderRadius: "0.5rem", paddingLeft: "2rem", paddingRight: "1.75rem", paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
                className="text-sm appearance-none cursor-pointer focus:outline-none">
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="relative">
              <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}
                style={{ ...inputStyle, borderRadius: "0.5rem", padding: "0.5rem 1.75rem 0.5rem 0.75rem" }}
                className="text-sm appearance-none cursor-pointer focus:outline-none">
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={surfaceStyle} className="rounded-xl overflow-hidden">
          <div style={{ borderBottom: "1px solid var(--border-light)" }} className="px-5 py-3.5 flex items-center justify-between">
            <span style={{ color: "var(--text-secondary)" }} className="text-sm font-medium">
              {filtered.length} equipment{filtered.length !== 1 ? "s" : ""}
              {search || filterStatus !== "All" || filterDept !== "All" ? " (filtered)" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div style={{ borderColor: "var(--spinner-track)", borderTopColor: "var(--spinner-head)" }} className="w-6 h-6 border-2 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <FlaskConical size={32} style={{ color: "var(--border)" }} className="mx-auto mb-3" />
              <p style={{ color: "var(--text-muted)" }} className="text-sm font-medium">No equipment found</p>
              <p style={{ color: "var(--text-subtle)" }} className="text-xs mt-1">
                {equipment.length === 0 ? "Add your first equipment to get started" : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                    {["Equipment ID", "Name", "Type", "Department", "Location", "Qualification Phases", "Status", "Next Due"].map((h) => (
                      <th key={h} style={{ color: "var(--text-muted)" }} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((eq, i) => (
                    <tr key={eq.id} onClick={() => router.push(`/equipment/${eq.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      style={{ cursor: "pointer", borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--border-light)" }}>
                      <td className="px-5 py-3.5">
                        <span style={{ background: "var(--bg-tag)", color: "var(--text-tag)" }} className="text-xs font-mono font-semibold px-2 py-0.5 rounded">{eq.equipment_id}</span>
                      </td>
                      <td className="px-5 py-3.5"><span style={{ color: "var(--text-primary)" }} className="text-sm font-medium">{eq.name}</span></td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{eq.type}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{eq.department}</td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>{eq.location}</td>
                      <td className="px-5 py-3.5"><PhaseBar urs={eq.urs_status} dq={eq.dq_status} fat={eq.fat_status} sat={eq.sat_status} iq={eq.iq_status} oq={eq.oq_status} pq={eq.pq_status} rq={eq.rq_status} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={eq.status} /></td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
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

      {showAddModal && <AddEquipmentModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchEquipment(); }} />}
    </div>
  );
}
