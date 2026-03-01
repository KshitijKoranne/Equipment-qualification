# EQ Tracker — Project Context & Reference

## Overview
A standalone GMP-compliant equipment qualification tracking system for pharmaceutical API manufacturing sites. Built as an internal tool to manage the full lifecycle of equipment qualification from URS through ongoing requalification, including breakdowns and revalidation.

**Repository:** https://github.com/KshitijKoranne/Equipment-qualification  
**Deployed:** Vercel (auto-deploys from `main` branch)  
**Database:** Turso (cloud SQLite) — fresh DB created after schema issues with original

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database client | `@libsql/client` (Turso / SQLite) |
| Styling | Tailwind CSS + CSS custom properties |
| Icons | Lucide React |
| Hosting | Vercel |
| DB hosting | Turso cloud (`libsql://eq-database-kskendsup.aws-ap-south-1.turso.io`) |

Environment variables required on Vercel:
- `TURSO_DATABASE_URL` = `libsql://eq-database-kskendsup.aws-ap-south-1.turso.io`
- `TURSO_AUTH_TOKEN` = (token stored in .env.local)

---

## Database Schema

### `equipment`
Primary record for each piece of equipment.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| equipment_id | TEXT UNIQUE NULLABLE | Tag number — auto-generated as EQ-YYYY-NNNN when DQ is Passed. Placeholder PENDING-{timestamp} at creation. |
| name | TEXT NOT NULL | Equipment name |
| type | TEXT NOT NULL | Manufacturing / Laboratory / Utility / QC / Packaging / Storage |
| department | TEXT NOT NULL | API Manufacturing / QC / Formulation / etc. |
| location | TEXT NOT NULL | Physical location |
| manufacturer | TEXT | |
| model | TEXT | |
| serial_number | TEXT | |
| installation_date | TEXT | Deferred — editable in Equipment Details tab |
| status | TEXT | Not Started / In Progress / Qualified / Overdue / Failed / Under Maintenance / Revalidation Required |
| change_control_number | TEXT | CC reference from QMS |
| urs_number | TEXT | URS document reference |
| urs_approval_date | TEXT | Date URS was approved |
| capacity | TEXT | e.g. 500L, 0–300°C |
| notes | TEXT | |
| requalification_frequency | TEXT | Legacy column, kept for OQ section display |
| requalification_tolerance | TEXT | Legacy column, kept for OQ section display |
| next_due_date | TEXT | Legacy column |
| created_at / updated_at | TEXT | datetime('now') |

### `qualifications`
One row per phase per equipment. Phases are fixed: URS, DQ, FAT, SAT, IQ, OQ, PQ.

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| equipment_id | INTEGER FK | References equipment.id |
| phase | TEXT | URS / DQ / FAT / SAT / IQ / OQ / PQ |
| protocol_number | TEXT | e.g. URS-HPLC-001, EQ-OQ-001 |
| execution_date | TEXT | |
| approval_date | TEXT | |
| approved_by | TEXT | |
| status | TEXT | Pending / In Progress / Passed / Failed / Waived / Not Applicable |
| remarks | TEXT | |

### `requalifications`
Multiple requalification events per equipment, added by user over equipment's lifetime.

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
| qualification_id | INTEGER FK | References qualifications.id (nullable) |
| requalification_id | INTEGER FK | References requalifications.id (nullable) |
| revalidation_phase_id | INTEGER FK | References revalidation_phases.id (nullable) |
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
IQ/OQ/PQ phases that need to be repeated after a breakdown.

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
 ↑                               ↓
Auto-Passed                Requalification #1
on creation               Requalification #2  (added via + button)
                          Requalification #N  (repeats throughout equipment life)
```

| Phase | Full Name | Key Purpose |
|---|---|---|
| URS | User Requirement Specification | Already prepared before equipment is registered. Auto-Passed on creation with all details from the Add Equipment form. |
| DQ | Design Qualification | Verifies proposed design meets URS. **Equipment ID (EQ-YYYY-NNNN) is auto-generated when DQ is set to Passed.** |
| FAT | Factory Acceptance Testing | Testing at manufacturer's site before shipment |
| SAT | Site Acceptance Testing | Testing at user's site after installation |
| IQ | Installation Qualification | Equipment installed correctly per specs |
| OQ | Operational Qualification | Functions within specs under worst-case conditions. Requalification frequency set here. |
| PQ | Performance Qualification | Performs consistently under real production conditions |
| Requalification | — | Multiple independent events, tracked separately per equipment |

---

## Phase Locking Rules

Phases are shown locked (greyed out, 🔒 overlay) if the previous phase has not been started:

- **Locked when:** previous phase status = `Pending`  
- **Unlocked when:** previous phase has **any** status other than `Pending` (In Progress, Passed, Failed, Waived, Not Applicable)
- URS is always unlocked (no predecessor)
- Locking is UI-only — not enforced at API level

---

## Equipment ID Auto-Generation

- At creation, `equipment_id` is set to `PENDING-{timestamp}` to satisfy the UNIQUE NOT NULL constraint
- When DQ phase is saved with status = `Passed`, the PUT route detects the PENDING- placeholder and auto-generates a real ID
- Format: `EQ-{YEAR}-{NNNN}` e.g. `EQ-2025-0001` — year-scoped, 4-digit zero-padded sequence
- Sequence auto-increments from the highest existing ID for that year in the DB
- The generated ID is returned in the PUT response `{ equipment_id }`
- UI shows a green banner for 8 seconds confirming the assigned ID
- User can still manually override the ID in Equipment Details → Edit

---

## DB Initialization

- `src/db/index.ts` exports `db` (Turso client) and `initDB()` (creates all 7 tables)
- `src/instrumentation.ts` runs `initDB()` once at server startup (Next.js 16 native)
- Every API route also has a local `ensureReady()` guard that calls `initDB()` on first request — this covers Vercel cold starts where instrumentation may not fire before the first API call
- No `ALTER TABLE` migrations needed — fresh DB has correct schema from the start
- Diagnostic endpoint: `GET /api/setup` — runs initDB and reports which tables exist

---

## API Routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/equipment` | List all equipment with phase statuses |
| POST | `/api/equipment` | Create equipment + all 7 phase rows (URS auto-Passed) |
| GET | `/api/equipment/[id]` | Equipment detail + qualifications + audit log |
| PUT | `/api/equipment/[id]` | Update equipment + one or more qualification phases; auto-generates Equipment ID if DQ just Passed |
| DELETE | `/api/equipment/[id]` | Delete equipment + all related records (cascades breakdowns, quals, attachments) |
| POST | `/api/attachments` | Upload file (base64) linked to qual phase or requalification |
| GET | `/api/attachments/[id]?type=qualification\|requalification` | List attachments |
| DELETE | `/api/attachments/[id]` | Remove attachment |
| GET | `/api/attachments/download/[id]` | Download file with correct Content-Type header |
| GET | `/api/breakdowns/[id]` | Get all breakdown events for equipment (with revalidation phases) |
| POST | `/api/breakdowns` | Log new breakdown; creates revalidation phase stubs if required |
| PUT | `/api/breakdowns/[id]` | Update breakdown (maintenance, status, revalidation phases); auto-recalculates equipment status |
| DELETE | `/api/breakdowns/[id]` | Remove breakdown + revalidation phases |
| GET | `/api/requalifications?equipment_id=X` | List all requalifications for equipment |
| POST | `/api/requalifications` | Add a new requalification event |
| PUT | `/api/requalifications/[id]` | Update requalification record |
| DELETE | `/api/requalifications/[id]` | Remove requalification record |
| GET | `/api/setup` | Diagnostic: runs initDB, reports table list and any missing tables |

---

## UI Structure

### Dashboard (`/`)
- **Header:** EQ Tracker logo, theme toggle, Add Equipment button
- **Stats bar:** Total equipment, Qualified (%), In Progress, Overdue/Due, Not Started
- **Filters:** Search (name/department), Status filter, Department filter
- **Table columns:** Name · Qualification Phases (phase bar) · Status · Next Due
- **Phase bar:** 7 mini colour-coded segments (URS/DQ/FAT/SAT/IQ/OQ/PQ)
- **Error handling:** if `/api/equipment` returns non-array, renders empty list instead of crashing

### Add Equipment Modal
Opened from dashboard. Sections:

1. **Change Control & URS Reference**
   - Change Control Number
   - URS Reference Number * (written to URS phase as protocol_number)
   - URS Execution Date (written to URS phase)
   - URS Approval Date (written to URS phase)
   - Approved By (written to URS phase)
   - URS Document (PDF) — drag-drop or click, auto-attached to URS qualification phase
   - URS Remarks (written to URS phase)
   - → URS phase created with status = **Passed** and all above fields filled in

2. **Equipment Identification** — Name*, Type*, Department*, Location*, Capacity
   - Equipment ID intentionally excluded (auto-generated on DQ approval)
   - Installation Date excluded (added later in Equipment Details)

3. **Technical Details** — Manufacturer, Model, Serial Number

4. **Notes**

> Requalification schedule is NOT in this form. It is set during OQ phase editing.

### Equipment Detail Page (`/equipment/[id]`)

**Header:** Equipment name, tag ID badge (hidden until DQ approved), department/location, status badge, theme toggle, Delete button

**Tabs:**

#### Qualification Phases tab
- **Progress strip:** 7 circles (URS→PQ) connected by lines, colour-coded by phase status
- **Phase cards** in 2-column grid — each card is independent:
  - Phase label + status badge + full name + description
  - **Per-tile Edit button** (top-right of each card header) — opens that card for editing only
  - **Per-tile Save / Cancel** — saves only that one phase, individual API call
  - No global Edit button on this tab
  - Fields: Protocol No., Approved By, Execution Date, Approval Date, Remarks
  - **Phase locking:** if previous phase = Pending, card shows grey overlay + 🔒 "Complete [X] first"
  - Attachments panel below fields (drag-drop, file list, download/delete)
- **URS card:** pre-filled and green on first open (all data from Add Equipment form)
- **DQ card:** shows hint "Equipment ID will be auto-generated when DQ is set to Passed"
- **OQ card:** additionally shows Requalification Frequency + Tolerance Window selectors (saved with OQ tile)
- **Requalifications section** below phase cards:
  - Lists all requalification events with status/dates/protocol
  - "+ Add Requalification" button
  - Each event expandable with full edit + attachments
- **Equipment ID banner:** green banner for 8s after DQ is saved as Passed, showing newly assigned ID

#### Equipment Details tab
- Global Edit/Save/Cancel buttons in header (only on this tab and others, not Qualification tab)
- Sections: Change Control & URS Reference · Equipment Identification (incl. editable Equipment ID) · Technical Details · Notes
- Equipment ID field shows "Auto-assigned when DQ is approved" in italic while unassigned

#### Equipment History tab
- "Log Equipment Event" button → inline form
- Fields: Reference (BH-xxx), Date, Reported By, Description, Type, Severity, Validation Impact
- If validation impact selected: Impact Assessment + IQ/OQ/PQ phase selectors
- Reporting sets equipment status → "Under Maintenance"
- Cards: expandable edit for maintenance details, root cause, revalidation outcomes
- Status flow: Open → Under Investigation → Maintenance In Progress → Revalidation In Progress → Closed
- Auto status update on close: → Qualified (if revalidation passed) or → Revalidation Required

#### Audit Log tab
- Chronological table: Date/Time, Action, Details, Changed By

---

## Theme System
- Light and dark themes via CSS custom properties (`--bg-base`, `--text-primary`, etc.)
- Toggle button on every page header
- Persisted in `localStorage` as `'eq-theme'`
- Respects `prefers-color-scheme` on first visit
- No flash: inline script in `<head>` applies `.dark` class before render
- WCAG AA compliant in both themes

---

## Key Design Decisions

- **URS auto-Passed on creation:** Equipment is only added to the system after URS is already prepared. The Add Equipment form collects all URS details (protocol, execution date, approval date, approved by, remarks, PDF). URS phase is created as Passed immediately.
- **Equipment ID auto-generated on DQ:** Tag numbers are assigned by stores/procurement after procurement/design confirmation. Auto-generated as EQ-YYYY-NNNN when DQ phase is first marked Passed.
- **Per-tile phase editing:** Each qualification phase card has its own Edit/Save/Cancel. Changes to one phase do not affect others. Saves an individual PUT call.
- **Phase locking:** UI prevents editing a phase until the previous one has any non-Pending status. Enforces the sequential qualification lifecycle without being overly strict.
- **Requalification as independent events:** Each requalification is a separate record (not a repeating phase). Frequency captured in OQ since that's when validated operating parameters are confirmed.
- **Attachments stored as base64:** Avoids need for S3/blob storage. Max 5MB per file. Practical for pharma environments with limited IT infrastructure.
- **ensureReady() in every route:** Vercel serverless cold starts don't reliably run instrumentation.ts before first API call. Each route self-initializes the DB on first request via a module-level `dbReady` flag.
- **All routes wrapped in try/catch:** Every API handler returns `NextResponse.json({ error })` with a status code instead of letting errors produce empty bodies (which caused "Unexpected end of JSON input" in the browser).

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
        route.ts                      # GET all, POST new (URS auto-Passed)
        [id]/route.ts                 # GET detail, PUT update (EQ ID auto-gen), DELETE
      attachments/
        route.ts                      # POST upload
        [id]/route.ts                 # GET list, DELETE
        download/[id]/route.ts        # GET file download
      breakdowns/
        route.ts                      # POST new breakdown
        [id]/route.ts                 # GET list, PUT update, DELETE
      requalifications/
        route.ts                      # GET list, POST new
        [id]/route.ts                 # PUT update, DELETE
      setup/
        route.ts                      # GET diagnostic — runs initDB, reports tables
    equipment/
      [id]/page.tsx                   # Equipment detail page (4 tabs)
  components/
    AddEquipmentModal.tsx             # Add equipment form (full URS fields)
    AttachmentPanel.tsx               # File attach/list/download component
    ThemeToggle.tsx                   # Sun/moon toggle button
  db/
    index.ts                          # DB client + initDB() — clean schema, no migrations
  instrumentation.ts                  # Runs initDB() once at server startup
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
12. Bug fix: JSON parse error from SQL/args mismatch in POST /api/equipment
13. Fix NOT NULL constraint — equipment_id uses PENDING- placeholder at creation
14. Auto-assign Equipment ID (EQ-YYYY-NNNN) when DQ phase is first set to Passed
15. Fix "Unexpected end of JSON input" — root cause: initDB() timing on cold start; added ensureReady() to all routes; all handlers wrapped in try/catch
16. Migrate to fresh Turso DB — eliminated schema debt (NOT NULL, ghost tables)
17. URS phase auto-Passed on equipment creation with all form fields pre-filled
18. Per-tile Edit/Save on qualification phase cards; phase locking (any non-Pending unlocks next); global Edit removed from Qualification tab; full URS fields in Add Equipment modal
