"use client";
import { useState, useRef } from "react";
import { X, Upload, FileText, XCircle } from "lucide-react";

type Props = { onClose: () => void; onSuccess: () => void; };

const EQUIPMENT_TYPES = ["Manufacturing", "Laboratory", "Utility", "QC", "Packaging", "Storage"];
const DEPARTMENTS = ["API Manufacturing", "Quality Control", "Formulation", "Packaging", "Warehouse", "Utilities", "R&D"];

type UrsFile = { file_name: string; file_size: number; file_type: string; file_data: string; };

export default function AddEquipmentModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ursFile, setUrsFile] = useState<UrsFile | null>(null);
  const [ursFileError, setUrsFileError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    // Change Control & URS
    change_control_number: "",
    urs_number: "",
    urs_approval_date: "",
    // Identification
    name: "",
    type: "Manufacturing",
    department: "API Manufacturing",
    location: "",
    capacity: "",
    // Technical
    manufacturer: "",
    model: "",
    serial_number: "",
    // Requalification intentionally excluded — set during OQ phase editing
    notes: "",
  });

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleUrsFile = (file: File) => {
    setUrsFileError("");
    if (file.size > 5 * 1024 * 1024) { setUrsFileError("File too large — max 5 MB."); return; }
    if (file.type !== "application/pdf") { setUrsFileError("Only PDF files are accepted for the URS document."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setUrsFile({ file_name: file.name, file_size: file.size, file_type: file.type, file_data: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.location) {
      setError("Equipment Name and Location are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, urs_attachment: ursFile }),
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
          <div className="px-6 py-5 space-y-6">

            {/* ── Change Control & URS ── */}
            <section>
              <SectionHeader label="Change Control & URS Reference" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Change Control Number" name="change_control_number" value={form.change_control_number}
                  onChange={set} placeholder="e.g. CC-2024-001" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <Field label="URS Reference Number" name="urs_number" value={form.urs_number}
                  onChange={set} placeholder="e.g. URS-HPLC-001" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="URS Approval Date" name="urs_approval_date" type="date" value={form.urs_approval_date}
                  onChange={set} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <div>
                  <label style={labelStyle} className="block text-xs font-medium mb-1.5">URS Document (PDF)</label>
                  {ursFile ? (
                    <div style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg">
                      <FileText size={14} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
                      <span style={{ color: "var(--text-primary)" }} className="text-xs font-medium flex-1 truncate">{ursFile.file_name}</span>
                      <button type="button" onClick={() => setUrsFile(null)}
                        style={{ color: "var(--badge-over-text)" }}
                        className="hover:opacity-70 transition-opacity flex-shrink-0">
                        <XCircle size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleUrsFile(f); }}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `1.5px dashed ${dragOver ? "var(--focus-ring)" : "var(--border)"}`,
                        background: dragOver ? "var(--bg-hover)" : "transparent",
                        color: "var(--text-muted)",
                      }}
                      className="rounded-lg py-2.5 flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                      <Upload size={13} />
                      <span className="text-xs">Attach PDF</span>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleUrsFile(e.target.files[0]); }} />
                  {ursFileError && <p style={{ color: "var(--badge-over-text)" }} className="text-xs mt-1">{ursFileError}</p>}
                </div>
              </div>
            </section>

            {/* ── Equipment Identification ── */}
            <section>
              <SectionHeader label="Equipment Identification" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Equipment Name *" name="name" value={form.name}
                  onChange={set} placeholder="e.g. HPLC System" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <Field label="Capacity" name="capacity" value={form.capacity}
                  onChange={set} placeholder="e.g. 500L, 0–300°C, 10 kg" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <SelectField label="Equipment Type" name="type" value={form.type} onChange={set}
                  options={EQUIPMENT_TYPES.map(o => ({ value: o, label: o }))} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <SelectField label="Department" name="department" value={form.department} onChange={set}
                  options={DEPARTMENTS.map(o => ({ value: o, label: o }))} inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <div className="mt-4">
                <Field label="Location *" name="location" value={form.location}
                  onChange={set} placeholder="e.g. Lab A, Room 101" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
              <p style={{ color: "var(--text-subtle)" }} className="text-xs mt-2">
                Equipment ID (tag number) can be assigned later once procurement is complete.
              </p>
            </section>

            {/* ── Technical Details ── */}
            <section>
              <SectionHeader label="Technical Details" />
              <div className="grid grid-cols-3 gap-4">
                <Field label="Manufacturer" name="manufacturer" value={form.manufacturer}
                  onChange={set} placeholder="e.g. Agilent" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <Field label="Model" name="model" value={form.model}
                  onChange={set} placeholder="e.g. 1260 Infinity" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
                <Field label="Serial Number" name="serial_number" value={form.serial_number}
                  onChange={set} placeholder="e.g. SN-12345" inputStyle={inputStyle} labelStyle={labelStyle} inputCls={inputCls} />
              </div>
            </section>

            {/* Notes */}
            <div>
              <label style={labelStyle} className="block text-xs font-medium mb-1.5">Notes</label>
              <textarea name="notes" value={form.notes} onChange={set} rows={2}
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

function SectionHeader({ label }: { label: string }) {
  return <p style={{ color: "var(--text-muted)" }} className="text-xs font-semibold uppercase tracking-wider mb-3">{label}</p>;
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
