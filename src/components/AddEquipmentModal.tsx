"use client";
import { useState } from "react";
import { X } from "lucide-react";

type Props = { onClose: () => void; onSuccess: () => void; };

const EQUIPMENT_TYPES = ["Manufacturing", "Laboratory", "Utility", "QC", "Packaging", "Storage"];
const DEPARTMENTS = ["API Manufacturing", "Quality Control", "Formulation", "Packaging", "Warehouse", "Utilities", "R&D"];
const FREQ_OPTIONS = [
  { value: "Annual",        label: "Annual (Every 1 Year)" },
  { value: "Every 2 Years", label: "Every 2 Years" },
  { value: "Every 5 Years", label: "Every 5 Years" },
];
const TOLERANCE_OPTIONS = [
  { value: "1", label: "± 1 Month" },
  { value: "2", label: "± 2 Months" },
  { value: "3", label: "± 3 Months" },
];

export default function AddEquipmentModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    equipment_id: "", name: "", type: "Manufacturing", department: "API Manufacturing",
    location: "", manufacturer: "", model: "", serial_number: "",
    installation_date: "", requalification_frequency: "Annual",
    requalification_tolerance: "1", notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.equipment_id || !form.name || !form.location) {
      setError("Equipment ID, Name, and Location are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/equipment", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add equipment"); }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally { setLoading(false); }
  };

  const inputStyle = { background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-primary)" };
  const inputCls = "w-full px-3 py-2 text-sm rounded-lg focus:outline-none";
  const labelStyle = { color: "var(--text-muted)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        className="relative rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div style={{ borderBottom: "1px solid var(--border)" }} className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 style={{ color: "var(--text-primary)" }} className="text-base font-semibold">Add New Equipment</h2>
            <p style={{ color: "var(--text-muted)" }} className="text-xs mt-0.5">Register equipment for qualification tracking</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "var(--bg-surface-2)" }}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-130px)]">
          <div className="px-6 py-5 space-y-5">

            {/* Identification */}
            <div>
              <h3 style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Equipment ID *" name="equipment_id" value={form.equipment_id} onChange={handleChange} placeholder="e.g. HPLC-001" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <Field label="Equipment Name *" name="name" value={form.name} onChange={handleChange} placeholder="e.g. HPLC System" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <SelectField label="Equipment Type" name="type" value={form.type} onChange={handleChange} options={EQUIPMENT_TYPES.map(o => ({ value: o, label: o }))} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <SelectField label="Department" name="department" value={form.department} onChange={handleChange} options={DEPARTMENTS.map(o => ({ value: o, label: o }))} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <div className="mt-4">
                <Field label="Location *" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Lab A, Room 101" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
            </div>

            {/* Equipment Details */}
            <div>
              <h3 style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Equipment Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. Agilent" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <Field label="Model" name="model" value={form.model} onChange={handleChange} placeholder="e.g. 1260 Infinity" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <Field label="Serial Number" name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="e.g. SN-12345" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <div className="mt-4">
                <Field label="Installation Date" name="installation_date" type="date" value={form.installation_date} onChange={handleChange} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
            </div>

            {/* Requalification Schedule */}
            <div>
              <h3 style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">Requalification Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <SelectField label="Requalification Frequency" name="requalification_frequency" value={form.requalification_frequency} onChange={handleChange} options={FREQ_OPTIONS} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <SelectField label="Tolerance Window" name="requalification_tolerance" value={form.requalification_tolerance} onChange={handleChange} options={TOLERANCE_OPTIONS} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <p style={{ color: "var(--text-muted)" }} className="text-xs mt-2">
                Requalification must be completed within the tolerance window before or after the due date.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                placeholder="Any additional remarks..."
                style={inputStyle} className={`${inputCls} resize-none`} />
            </div>

            {error && (
              <div style={{ background: "var(--badge-over-bg)", border: "1px solid var(--badge-over-border)", color: "var(--badge-over-text)" }}
                className="text-sm px-4 py-2.5 rounded-lg">{error}</div>
            )}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface-2)" }}
            className="px-6 py-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} style={{ color: "var(--text-secondary)" }}
              className="px-4 py-2 text-sm font-medium hover:opacity-80 transition-opacity">Cancel</button>
            <button type="submit" disabled={loading}
              style={{ background: "var(--text-primary)", color: "var(--bg-surface)" }}
              className="px-5 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Adding..." : "Add Equipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type FieldProps = { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string; inputStyle: React.CSSProperties; labelStyle: React.CSSProperties; inputCls: string; };
function Field({ label, name, value, onChange, placeholder, type = "text", inputStyle, labelStyle, inputCls }: FieldProps) {
  return (
    <div>
      <label style={labelStyle} className="block text-xs font-medium mb-1.5">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} style={inputStyle} className={inputCls} />
    </div>
  );
}

type SelectProps = { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]; inputStyle: React.CSSProperties; labelStyle: React.CSSProperties; inputCls: string; };
function SelectField({ label, name, value, onChange, options, inputStyle, labelStyle, inputCls }: SelectProps) {
  return (
    <div>
      <label style={labelStyle} className="block text-xs font-medium mb-1.5">{label}</label>
      <select name={name} value={value} onChange={onChange} style={inputStyle} className={inputCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
