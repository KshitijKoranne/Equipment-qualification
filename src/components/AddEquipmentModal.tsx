"use client";
import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

const EQUIPMENT_TYPES = ["Manufacturing", "Laboratory", "Utility", "QC", "Packaging", "Storage"];
const DEPARTMENTS = ["API Manufacturing", "Quality Control", "Formulation", "Packaging", "Warehouse", "Utilities", "R&D"];
const FREQ_OPTIONS = ["Semi-Annual", "Annual", "Biennial", "As Required"];

export default function AddEquipmentModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    equipment_id: "",
    name: "",
    type: "Manufacturing",
    department: "API Manufacturing",
    location: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    installation_date: "",
    requalification_frequency: "Annual",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add equipment");
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Add New Equipment</h2>
            <p className="text-xs text-slate-400 mt-0.5">Register equipment for qualification tracking</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-130px)]">
          <div className="px-6 py-5 space-y-5">
            {/* Section: Identification */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Equipment ID *" name="equipment_id" value={form.equipment_id} onChange={handleChange} placeholder="e.g. HPLC-001" />
                <Field label="Equipment Name *" name="name" value={form.name} onChange={handleChange} placeholder="e.g. HPLC System" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <SelectField label="Equipment Type" name="type" value={form.type} onChange={handleChange} options={EQUIPMENT_TYPES} />
                <SelectField label="Department" name="department" value={form.department} onChange={handleChange} options={DEPARTMENTS} />
              </div>
              <div className="mt-4">
                <Field label="Location *" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Lab A, Room 101" />
              </div>
            </div>

            {/* Section: Equipment Details */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Equipment Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Manufacturer" name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. Agilent" />
                <Field label="Model" name="model" value={form.model} onChange={handleChange} placeholder="e.g. 1260 Infinity" />
                <Field label="Serial Number" name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="e.g. SN-12345" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field label="Installation Date" name="installation_date" type="date" value={form.installation_date} onChange={handleChange} />
                <SelectField label="Requalification Frequency" name="requalification_frequency" value={form.requalification_frequency} onChange={handleChange} options={FREQ_OPTIONS} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                placeholder="Any additional remarks..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Equipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, name, value, onChange, placeholder, type = "text"
}: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
      />
    </div>
  );
}

function SelectField({
  label, name, value, onChange, options
}: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
