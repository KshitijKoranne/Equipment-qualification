# Equipment Qualification Tracker

A pharmaceutical equipment qualification tracking system built with **Next.js 15** and **SQLite**.

## Features

- Dashboard with site-wide equipment qualification status
- Color-coded status indicators (Qualified, In Progress, Overdue, etc.)
- DQ / IQ / OQ / PQ phase tracking per equipment
- Equipment detail page with editable qualification phases
- Audit log for every change
- Filter by status, department, and search by name/ID
- Add / Edit / Delete equipment

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** SQLite via `@libsql/client` (local file `dev.db`)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Getting Started

### Prerequisites
- Node.js 18+

### Installation

```bash
git clone https://github.com/KshitijKoranne/Equipment-qualification.git
cd Equipment-qualification
npm install
npm run dev
```

Open http://localhost:3000

The SQLite database (dev.db) is created automatically on first run. No setup needed.

## Database Migration (When Ready for Production)

When moving from SQLite to PostgreSQL on your company server:
1. Change `@libsql/client` to a PostgreSQL client (e.g. `pg`)
2. Update `src/db/index.ts` connection string to your server
3. Same SQL schema works — it is standard SQL compatible with PostgreSQL

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── equipment/[id]/page.tsx     # Equipment detail
│   └── api/equipment/              # REST API routes
├── components/
│   └── AddEquipmentModal.tsx       # Add equipment modal
└── db/
    └── index.ts                    # DB client + schema init
```
