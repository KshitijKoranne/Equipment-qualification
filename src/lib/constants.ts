import { CheckCircle2, Activity, Clock, AlertTriangle, XCircle } from "lucide-react";

// ─── Phase Order & Options ───────────────────────────────────────────────────

export const PHASE_ORDER = ["URS", "DQ", "FAT", "SAT", "IQ", "OQ", "PQ"];
export const STATUS_OPTIONS = ["Pending", "In Progress", "Passed", "Failed", "Waived", "Not Applicable"];

export const PHASE_INFO: Record<string, { full: string; desc: string }> = {
  URS: { full: "User Requirement Specification", desc: "Documents what the user requires the equipment to do — the foundation of all qualification activities" },
  DQ:  { full: "Design Qualification", desc: "Documented verification that the proposed design meets URS and regulatory requirements" },
  FAT: { full: "Factory Acceptance Testing", desc: "Testing performed at the manufacturer's facility before shipment to verify equipment meets design specifications" },
  SAT: { full: "Site Acceptance Testing", desc: "Testing performed after installation at the user's site to confirm equipment functions correctly in its actual environment" },
  IQ:  { full: "Installation Qualification", desc: "Verified that equipment is installed correctly per manufacturer specs and approved drawings" },
  OQ:  { full: "Operational Qualification", desc: "Equipment functions within operational specifications under controlled conditions including worst-case" },
  PQ:  { full: "Performance Qualification", desc: "Equipment performs consistently under real-world production conditions using actual materials" },
};

// ─── Equipment Status Config (dashboard + detail header) ─────────────────────

type StatusCfg = {
  label: string;
  bgVar: string;
  textVar: string;
  borderVar: string;
  dotBg: string;
  icon: React.ComponentType<{ size?: number }>;
};

export const STATUS_CONFIG: Record<string, StatusCfg> = {
  Qualified:                { label: "Qualified",              bgVar: "--badge-qual-bg",  textVar: "--badge-qual-text",  borderVar: "--badge-qual-border",  dotBg: "#3fb950", icon: CheckCircle2 },
  "In Progress":            { label: "In Progress",            bgVar: "--badge-prog-bg",  textVar: "--badge-prog-text",  borderVar: "--badge-prog-border",  dotBg: "#58a6ff", icon: Activity },
  "Not Started":            { label: "Not Started",            bgVar: "--badge-none-bg",  textVar: "--badge-none-text",  borderVar: "--badge-none-border",  dotBg: "#8b949e", icon: Clock },
  Overdue:                  { label: "Overdue",                bgVar: "--badge-over-bg",  textVar: "--badge-over-text",  borderVar: "--badge-over-border",  dotBg: "#f85149", icon: XCircle },
  Failed:                   { label: "Failed",                 bgVar: "--badge-fail-bg",  textVar: "--badge-fail-text",  borderVar: "--badge-fail-border",  dotBg: "#fb8f44", icon: AlertTriangle },
  "Requalification Due":    { label: "Requalification Due",    bgVar: "--badge-warn-bg",  textVar: "--badge-warn-text",  borderVar: "--badge-warn-border",  dotBg: "#e3b341", icon: AlertTriangle },
  "Under Maintenance":      { label: "Under Maintenance",      bgVar: "--badge-maint-bg", textVar: "--badge-maint-text", borderVar: "--badge-maint-border", dotBg: "#a5b4fc", icon: Activity },
  "Revalidation Required":  { label: "Revalidation Required",  bgVar: "--badge-reval-bg", textVar: "--badge-reval-text", borderVar: "--badge-reval-border", dotBg: "#f9a8d4", icon: AlertTriangle },
};

// Simpler variant used on detail page header (no border/dot)
export const EQUIP_STATUS: Record<string, { bg: string; text: string; icon: React.ComponentType<{ size?: number }> }> = {
  Qualified:              { bg: "--badge-qual-bg",  text: "--badge-qual-text",  icon: CheckCircle2 },
  "In Progress":          { bg: "--badge-prog-bg",  text: "--badge-prog-text",  icon: Activity },
  "Not Started":          { bg: "--badge-none-bg",  text: "--badge-none-text",  icon: Clock },
  Overdue:                { bg: "--badge-over-bg",  text: "--badge-over-text",  icon: XCircle },
  Failed:                 { bg: "--badge-fail-bg",  text: "--badge-fail-text",  icon: AlertTriangle },
  "Requalification Due":  { bg: "--badge-warn-bg",  text: "--badge-warn-text",  icon: AlertTriangle },
  "Under Maintenance":    { bg: "--badge-maint-bg", text: "--badge-maint-text", icon: Activity },
  "Revalidation Required":{ bg: "--badge-reval-bg", text: "--badge-reval-text", icon: AlertTriangle },
};

// ─── Phase dot colours (dashboard phase bar) ────────────────────────────────

export const PHASE_DOT: Record<string, string> = {
  Passed: "#3fb950",
  Failed: "#f85149",
  "In Progress": "#58a6ff",
  Pending: "var(--border)",
};

// ─── Qualification badge colours ────────────────────────────────────────────

type BadgeStyle = { bg: string; text: string; border: string };

export const QUAL_BADGE: Record<string, BadgeStyle> = {
  Passed:           { bg: "--qbadge-pass-bg", text: "--qbadge-pass-text", border: "--qbadge-pass-border" },
  Failed:           { bg: "--qbadge-fail-bg", text: "--qbadge-fail-text", border: "--qbadge-fail-border" },
  "In Progress":    { bg: "--qbadge-prog-bg", text: "--qbadge-prog-text", border: "--qbadge-prog-border" },
  Pending:          { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" },
  Waived:           { bg: "--qbadge-waiv-bg", text: "--qbadge-waiv-text", border: "--qbadge-waiv-border" },
  "Not Applicable": { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" },
};

// ─── Requalification constants ──────────────────────────────────────────────

export const RQ_STATUS_OPTIONS = ["Scheduled", "In Progress", "Passed", "Failed"];
export const RQ_FREQ_OPTIONS = ["Annual", "Every 2 Years", "Every 5 Years"];

export const RQ_STATUS_COLORS: Record<string, BadgeStyle> = {
  Scheduled:     { bg: "--qbadge-pend-bg", text: "--qbadge-pend-text", border: "--qbadge-pend-border" },
  "In Progress": { bg: "--qbadge-prog-bg", text: "--qbadge-prog-text", border: "--qbadge-prog-border" },
  Passed:        { bg: "--qbadge-pass-bg", text: "--qbadge-pass-text", border: "--qbadge-pass-border" },
  Failed:        { bg: "--qbadge-fail-bg", text: "--qbadge-fail-text", border: "--qbadge-fail-border" },
};

// ─── Breakdown / History constants ──────────────────────────────────────────

export const BREAKDOWN_TYPES = ["Mechanical", "Electrical", "Software/Firmware", "Pneumatic/Hydraulic", "Calibration Failure", "Contamination", "Wear & Tear", "Other"];
export const SEVERITY_LEVELS = ["Minor", "Moderate", "Major", "Critical"];
export const VALIDATION_IMPACTS = ["No Impact", "Partial Revalidation Required", "Full Revalidation Required"];
export const REVALIDATION_PHASE_OPTIONS = ["IQ", "OQ", "PQ"];
export const BD_STATUS_OPTIONS = ["Open", "Under Investigation", "Maintenance In Progress", "Revalidation In Progress", "Closed", "Cancelled"];
export const REVAL_STATUS_OPTIONS = ["Pending", "In Progress", "Passed", "Failed"];

export const SEVERITY_COLORS: Record<string, BadgeStyle> = {
  Minor:    { bg: "--badge-none-bg", text: "--badge-none-text", border: "--badge-none-border" },
  Moderate: { bg: "--badge-warn-bg", text: "--badge-warn-text", border: "--badge-warn-border" },
  Major:    { bg: "--badge-fail-bg", text: "--badge-fail-text", border: "--badge-fail-border" },
  Critical: { bg: "--badge-over-bg", text: "--badge-over-text", border: "--badge-over-border" },
};

export const BD_STATUS_COLORS: Record<string, BadgeStyle> = {
  Open:                       { bg: "--badge-over-bg",  text: "--badge-over-text",  border: "--badge-over-border" },
  "Under Investigation":      { bg: "--badge-warn-bg",  text: "--badge-warn-text",  border: "--badge-warn-border" },
  "Maintenance In Progress":  { bg: "--badge-maint-bg", text: "--badge-maint-text", border: "--badge-maint-border" },
  "Revalidation In Progress": { bg: "--badge-reval-bg", text: "--badge-reval-text", border: "--badge-reval-border" },
  Closed:                     { bg: "--badge-qual-bg",  text: "--badge-qual-text",  border: "--badge-qual-border" },
  Cancelled:                  { bg: "--badge-pend-bg",  text: "--badge-pend-text",  border: "--badge-pend-border" },
};

// ─── Equipment types and departments (Add Equipment form) ───────────────────

export const EQUIPMENT_TYPES = ["Manufacturing", "Laboratory", "Utility", "QC", "Packaging", "Storage"];
export const DEPARTMENTS = ["API Manufacturing", "Quality Control", "Formulation", "Packaging", "Warehouse", "Utilities", "R&D"];
