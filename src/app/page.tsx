"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Filter, ChevronDown, FlaskConical } from "lucide-react";
import AddEquipmentModal from "@/components/AddEquipmentModal";
import ThemeToggle from "@/components/ThemeToggle";
import { StatusBadge, PhaseBar } from "@/components/ui";
import { STATUS_CONFIG } from "@/lib/constants";
import { formatDate, SURFACE_STYLE, INPUT_STYLE } from "@/lib/utils";
import type { EquipmentListItem } from "@/lib/types";

type Equipment = EquipmentListItem;

export default function Dashboard() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);

  const [fetchError, setFetchError] = useState("");

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const res = await fetch("/api/equipment");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      setEquipment(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setFetchError(e instanceof Error ? e.message : "Failed to load equipment");
    }
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

  const inputStyle = INPUT_STYLE;
  const surfaceStyle = SURFACE_STYLE;

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
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p style={{ color: "var(--badge-over-text)" }} className="text-sm font-medium">Failed to load equipment</p>
              <p style={{ color: "var(--text-muted)" }} className="text-xs max-w-md text-center">{fetchError}</p>
              <button onClick={fetchEquipment} style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
                className="px-4 py-2 rounded-lg text-xs font-semibold mt-1 hover:opacity-90">Retry</button>
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
                    {["Name", "Qualification Phases", "Status", "Next Due"].map((h) => (
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
                      <td className="px-5 py-3.5"><span style={{ color: "var(--text-primary)" }} className="text-sm font-medium">{eq.name}</span></td>
                      <td className="px-5 py-3.5"><PhaseBar urs={eq.urs_status} dq={eq.dq_status} fat={eq.fat_status} sat={eq.sat_status} iq={eq.iq_status} oq={eq.oq_status} pq={eq.pq_status} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={eq.status} /></td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {eq.next_due_date ? formatDate(eq.next_due_date) : "—"}
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
