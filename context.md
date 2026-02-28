# EQ Tracker — Project Context & Reference

## Overview
A standalone GMP-compliant equipment qualification tracking system for pharmaceutical API manufacturing sites. Built as an internal tool to manage the full lifecycle of equipment qualification from URS through ongoing requalification, including breakdowns and revalidation.

**Repository:** https://github.com/KshitijKoranne/Equipment-qualification  
**Deployed:** Vercel (auto-deploys from `main` branch)  
**Database:** Turso (cloud SQLite) in production, `dev.db` locally

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database client | `@libsql/client` (Turso / SQLite) |
| Styling | Tailwind CSS + CSS custom properties |
| Icons | Lucide React |
| Hosting | Vercel |
| DB hosting | Turso cloud (`libsql://eq-qualification-kskendsup.aws-ap-south-1.turso.io`) |

Environment variables required on Vercel:
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

---

## Database Schema

### `equipment`
Primary record for each piece of equipment.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| equipment_id | TEXT UNIQUE | Tag number — assigned after procurement, nullable at creation |
| name | TEXT NOT NULL | Equipment name |
| type | TEXT NOT NULL | Manufacturing / Laboratory / Utility / QC / Packaging / Storage |
| department | TEXT NOT NULL | API Manufacturing / QC / Formulation / etc. |
| location | TEXT NOT NULL | Physical location |
| manufacturer | TEXT | |
| model | TEXT | |
| serial_number | TEXT | |
| installation_date | TEXT | |
| status | TEXT | Not Started / In Progress / Qualified / Overdue / Failed / Under Maintenance / Revalidation Required |
| change_control_number | TEXT | CC reference from QMS |
| urs_number | TEXT | URS document reference |
| urs_approval_date | TEXT | Date URS was approved |
| capacity | TEXT | e.g. 500L, 0–300°C |
| notes | TEXT | |
| created_at / updated_at | TEXT | datetime('now') |

> `requalification_frequency`, `requalification_tolerance`, `next_due_date` columns exist in DB for legacy reasons but are no longer used in the UI. Requalification is managed through the `requalifications` table.

### `qualifications`
One row per phase per equipment. Phases are fixed: URS, DQ, FAT, SAT, IQ, OQ, PQ.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| equipment_id | INTEGER FK | References equipment.id |
| phase | TEXT | URS / DQ / FAT / SAT / IQ / OQ / PQ |
| protocol_number | TEXT | e.g. EQ-OQ-001 |
| execution_date | TEXT | |
| approval_date | TEXT | |
| approved_by | TEXT | |
| status | TEXT | Pending / In Progress / Passed / Failed / Waived / Not Applicable |
| remarks | TEXT | |

### `requalifications`
Multiple requalification events per equipment, added by user over the equipment's lifetime.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| equipment_id | INTEGER FK | References equipment.id |
| requalification_ref | TEXT | e.g. RQ-001 |
| frequency | TEXT | Annual / Every 2 Years / Every 5 Years |
| tolerance_months | TEXT | 1 / 2 / 3 |
| scheduled_date | TEXT | When it is due |
| execution_date | TEXT | When it was actually done |
| protocol_number | TEXT | |
| approval_date | TEXT | |
| approved_by | TEXT | |
| status | TEXT | Scheduled / In Progress / Passed / Failed |
| remarks | TEXT | |
| created_at / updated_at | TEXT | |

### `attachments`
Files attached to qualification phases or requalification events.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| qualification_id | INTEGER FK | References qualifications.id (nullable if requalification) |
| requalification_id | INTEGER FK | References requalifications.id (nullable if qualification) |
| revalidation_phase_id | INTEGER FK | References revalidation_phases.id |
| file_name | TEXT NOT NULL | |
| file_size | INTEGER | bytes |
| file_type | TEXT | MIME type |
| file_data | TEXT NOT NULL | Base64 encoded, max ~5MB |
| uploaded_at | TEXT | |

### `breakdowns`
Equipment failure and maintenance events.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| equipment_id | INTEGER FK | |
| breakdown_ref | TEXT | e.g. BH-001 |
| reported_date | TEXT | |
| reported_by | TEXT | |
| description | TEXT NOT NULL | |
| root_cause | TEXT | |
| breakdown_type | TEXT | Mechanical / Electrical / Software / Pneumatic / Calibration / Contamination / Wear & Tear / Other |
| severity | TEXT | Minor / Moderate / Major / Critical |
| maintenance_start / end | TEXT | |
| maintenance_performed_by | TEXT | |
| maintenance_details | TEXT | |
| validation_impact | TEXT | No Impact / Partial Revalidation Required / Full Revalidation Required |
| impact_assessment | TEXT | |
| status | TEXT | Open / Under Investigation / Maintenance In Progress / Revalidation In Progress / Closed / Cancelled |
| closure_date / closed_by / closure_remarks | TEXT | |

### `revalidation_phases`
Phases (IQ/OQ/PQ) that need to be repeated after a breakdown.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| breakdown_id | INTEGER FK | |
| phase | TEXT | IQ / OQ / PQ |
| protocol_number, execution_date, approval_date, approved_by | TEXT | |
| status | TEXT | Pending / In Progress / Passed / Failed |
| remarks | TEXT | |

### `audit_log`
Append-only log of all changes.

| Column | Type |
|---|---|
| id | INTEGER PK |
| equipment_id | INTEGER FK |
| action | TEXT |
| changed_by | TEXT |
| details | TEXT |
| created_at | TEXT |

---

## Qualification Lifecycle (Phase Order)

```
URS → DQ → FAT → SAT → IQ → OQ → PQ
                                    ↓
                              Requalification #1
                              Requalification #2  (added via + button)
                              Requalification #N  (repeats throughout equipment life)
```

| Phase | Full Name | Key Purpose |
|---|---|---|
| URS | User Requirement Specification | Documents what the user requires — foundation of all qualification |
| DQ | Design Qualification | Verifies proposed design meets URS and regulatory requirements |
| FAT | Factory Acceptance Testing | Testing at manufacturer's site before shipment |
| SAT | Site Acceptance Testing | Testing at user's site after installation, in actual environment |
| IQ | Installation Qualification | Equipment installed correctly per manufacturer specs |
| OQ | Operational Qualification | Functions within specs under controlled/worst-case conditions. **Requalification frequency is set here.** |
| PQ | Performance Qualification | Performs consistently under real-world production conditions |
| Requalification | — | Multiple events added by user, each tracked independently |

---

## API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/equipment` | List all equipment with phase statuses |
| POST | `/api/equipment` | Create equipment + all 7 phase rows |
| GET | `/api/equipment/[id]` | Equipment detail + qualifications + audit log |
| PUT | `/api/equipment/[id]` | Update equipment + qualification phases |
| DELETE | `/api/equipment/[id]` | Delete equipment + all related records |
| POST | `/api/attachments` | Upload file (base64) linked to qual phase |
| GET | `/api/attachments/[id]` | List attachments for a qualification |
| DELETE | `/api/attachments/[id]` | Remove attachment |
| GET | `/api/attachments/download/[id]` | Download file with correct Content-Type |
| GET | `/api/breakdowns/[id]` | Get all breakdown events for equipment |
| POST | `/api/breakdowns` | Log new breakdown event |
| PUT | `/api/breakdowns/[id]` | Update breakdown (maintenance, status, revalidation phases) |
| GET | `/api/requalifications/[equipmentId]` | List all requalifications for equipment |
| POST | `/api/requalifications` | Add a new requalification event |
| PUT | `/api/requalifications/[id]` | Update requalification record |
| DELETE | `/api/requalifications/[id]` | Remove requalification record |

---

## UI Structure

### Dashboard (`/`)
- **Header:** EQ Tracker logo, theme toggle, Add Equipment button
- **Stats bar:** Total equipment, Qualified (%), In Progress, Overdue/Due, Not Started
- **Filters:** Search (name/ID/department), Status filter, Department filter
- **Table columns:** Equipment ID · Name · Department · Qualification Phases · Status · Next Due
- **Phase bar:** 8 mini colour-coded segments (URS/DQ/FAT/SAT/IQ/OQ/PQ/RQ)

### Add Equipment Modal
Opened from dashboard. Sections:
1. **Change Control & URS Reference** — CC Number, URS Reference Number, URS Approval Date, URS PDF upload (auto-attaches to URS phase)
2. **Equipment Identification** — Name*, Type, Department*, Location*, Capacity. Equipment ID intentionally excluded (assigned post-procurement).
3. **Technical Details** — Manufacturer, Model, Serial Number, Installation Date
4. **Notes**

> Requalification schedule is NOT in this form. It is set during OQ phase editing.

### Equipment Detail Page (`/equipment/[id]`)

**Header:** Equipment name, tag ID badge, department/location, status badge, theme toggle, Edit/Delete buttons

**Tabs:**

#### Qualification Phases
- Progress strip: 7 circles (URS→DQ→FAT→SAT→IQ→OQ→PQ) connected by lines, colour-coded by status
- Phase cards in 2-column grid, each with:
  - Phase label, status badge, description
  - Fields: Protocol No., Approved By, Execution Date, Approval Date, Remarks
  - **OQ card additionally has:** Requalification Frequency selector + **"+ Add Requalification"** button
  - Attachments panel (drag-drop, file list with download/delete)
- Below PQ (or after OQ), a **Requalifications section**: list of all requalification events for this equipment, each expandable, with their own protocol/dates/status/attachments. "+" button adds a new one.

#### Equipment Details
Four sections (each with section header):
1. **Change Control & URS Reference** — CC Number, URS Number, URS Approval Date
2. **Equipment Identification** — Equipment ID (tag, editable here), Name, Type, Department, Location, Capacity
3. **Technical Details** — Manufacturer, Model, Serial Number, Installation Date
4. **Requalification Schedule** — (removed from this section; requalifications are tracked separately)

#### Equipment History (formerly Breakdowns)
- "Log Equipment Event" button opens inline form
- Fields: Reference (BH-xxx), Date, Reported By, Description, Breakdown Type, Severity, Validation Impact
- If validation impact selected: Impact Assessment text + phase selectors (IQ/OQ/PQ)
- Reporting sets equipment status → "Under Maintenance"
- Cards: expandable, edit mode fills maintenance details, root cause, revalidation phase outcomes
- Status flow: Open → Under Investigation → Maintenance In Progress → Revalidation In Progress → Closed
- Closure: date, closed by, closure/CAPA remarks
- Auto status update on close: → Qualified (if all revalidation passed) or → Revalidation Required

#### Audit Log
- Chronological table: Date/Time, Action, Details, Changed By

---

## Theme System
- Light and dark themes via CSS custom properties (`--bg-base`, `--text-primary`, etc.)
- Toggle button (sun/moon icon) on every page header
- Persisted in `localStorage` as `'eq-theme'`
- Respects `prefers-color-scheme` on first visit
- No flash: inline script in `<head>` applies `.dark` class before render
- WCAG AA compliant in both themes (all badge/text contrast ratios verified)

---

## Status Badge Colours

| Status | Light | Dark |
|---|---|---|
| Qualified | Green | Green |
| In Progress | Blue | Blue |
| Not Started | Slate | Slate |
| Overdue | Red | Red |
| Failed | Orange | Orange |
| Requalification Due | Amber | Amber |
| Under Maintenance | Indigo | Indigo |
| Revalidation Required | Pink | Pink |

---

## Key Design Decisions

- **Equipment ID deferred:** Tag numbers are assigned by stores/procurement after purchase. Users register equipment early (at URS/CC stage) without it, and fill it in later via Equipment Details edit.
- **Requalification as independent events:** Each requalification is a separate record (not a repeating phase), so you can track history over the equipment's 10–20 year life. Frequency is captured in OQ since that's when validated operating parameters are confirmed.
- **Attachments stored as base64 in SQLite:** Avoids need for S3/blob storage. Practical for pharma environments with limited IT infrastructure. Max 5MB per file.
- **URS PDF auto-attached at creation:** When adding equipment, uploading a URS PDF immediately creates an attachment record linked to the URS qualification phase.
- **Equipment History (not just Breakdowns):** The tab is named "Equipment History" to cover planned maintenance, calibration deviations, and other events — not only failures.
- **Revalidation linked to events:** When a breakdown requires revalidation, specific phases (IQ/OQ/PQ) are tracked as revalidation sub-records under that event, separate from the primary qualification phases.
- **All DB migrations are safe:** New columns are added via `ALTER TABLE ... ADD COLUMN` in a try/catch so existing Turso data is never lost on deployment.

---

## File Structure
```
src/
  app/
    page.tsx                          # Dashboard
    globals.css                       # Theme CSS variables
    layout.tsx                        # Root layout, no-flash script
    api/
      equipment/
        route.ts                      # GET all, POST new
        [id]/route.ts                 # GET detail, PUT update, DELETE
      attachments/
        route.ts                      # POST upload
        [id]/route.ts                 # GET list, DELETE
        download/[id]/route.ts        # GET file download
      breakdowns/
        route.ts                      # POST new breakdown
        [id]/route.ts                 # GET list, PUT update, DELETE
      requalifications/
        route.ts                      # POST new requalification
        [id]/route.ts                 # GET list, PUT update, DELETE
    equipment/
      [id]/page.tsx                   # Equipment detail page
  components/
    AddEquipmentModal.tsx             # Add equipment form
    AttachmentPanel.tsx               # File attach/list/download component
    ThemeToggle.tsx                   # Sun/moon toggle button
  db/
    index.ts                          # DB client, schema init, migrations
```

---

## Commit History (significant)
1. Initial commit: Full app with DQ/IQ/OQ/PQ phases
2. Switch to Turso cloud database for Vercel deployment
3. Fix text readability — improve contrast across all pages
4. Update requalification frequency options and add tolerance window
5. Add dark theme with WCAG AA compliance across all pages
6. Add full qualification lifecycle phases (URS→DQ→FAT→SAT→IQ→OQ→PQ) + file attachments
7. Add breakdown management and post-breakdown revalidation
8. Add SAT phase — correct lifecycle order
9. Rework Add Equipment form — CC number, URS fields, capacity; defer Equipment ID
10. Remove redundant dashboard columns; rename Breakdowns → Equipment History
11. Requalification redesigned as multiple independent events; removed from Add Equipment form
