// ─── Shared Types ────────────────────────────────────────────────────────────

export type Equipment = {
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
  change_control_number: string;
  urs_number: string;
  urs_approval_date: string;
  capacity: string;
};

export type EquipmentListItem = {
  id: number;
  equipment_id: string;
  name: string;
  type: string;
  department: string;
  location: string;
  status: string;
  next_due_date: string;
  urs_status: string;
  dq_status: string;
  fat_status: string;
  sat_status: string;
  iq_status: string;
  oq_status: string;
  pq_status: string;
};

export type Qualification = {
  id: number;
  phase: string;
  protocol_number: string;
  execution_date: string;
  approval_date: string;
  approved_by: string;
  status: string;
  remarks: string;
};

export type AuditEntry = {
  id: number;
  action: string;
  details: string;
  changed_by: string;
  created_at: string;
};

export type RevalidationPhase = {
  id: number;
  breakdown_id: number;
  phase: string;
  protocol_number: string;
  execution_date: string;
  approval_date: string;
  approved_by: string;
  status: string;
  remarks: string;
};

export type Requalification = {
  id: number;
  equipment_id: number;
  requalification_ref: string;
  frequency: string;
  tolerance_months: string;
  scheduled_date: string;
  execution_date: string;
  protocol_number: string;
  approval_date: string;
  approved_by: string;
  status: string;
  remarks: string;
};

export type History = {
  id: number;
  equipment_id: number;
  breakdown_ref: string;
  reported_date: string;
  reported_by: string;
  description: string;
  root_cause: string;
  breakdown_type: string;
  severity: string;
  maintenance_start: string;
  maintenance_end: string;
  maintenance_performed_by: string;
  maintenance_details: string;
  validation_impact: string;
  impact_assessment: string;
  status: string;
  closure_date: string;
  closed_by: string;
  closure_remarks: string;
  revalidation_phases: RevalidationPhase[];
};

// Shared style props passed to sub-components
export type StyleProps = {
  surfaceStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  inputCls: string;
  labelStyle: React.CSSProperties;
};
