# USCCMPC Attendance System

An offline, air-gapped attendance and election tracking system for USCCMPC-MPC events — built with Next.js 15, Prisma, and SQLite. Runs fully on a local machine with LAN access, no internet required.

For a fresh clone, starting the app again, and opening the database, see [docs/running.md](docs/running.md).

---

## Features

- 🔍 **Fast member search** with accent-insensitive matching (ñ ↔ n supported)
- ✅ **Check-in / Check-out** with queue number assignment and mismatch detection
- 📋 **Live activity feed** showing recent check-ins and check-outs in real time
- 🗳️ **Election panel** to track voting status for checked-in Regular members
- 👥 **Role-based access** — Admin, Staff, Election
- 📤 **Bulk CSV/XLSX upload** for member lists
- 📊 **Export attendance** to CSV or XLSX with full details
- 💾 **Backup & restore** member database as JSON
- 🌙 **Light / Dark theme** toggle
- 🏠 **Fully offline** — no external dependencies at runtime

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | SQLite via Prisma ORM |
| Auth | NextAuth.js |
| UI | Tailwind CSS + Lucide icons |
| Excel | SheetJS (xlsx) |

---

## Quick Start (First-Time Setup)

### 1. Prerequisites

Install once on the host machine:

- **[Node.js LTS v20+](https://nodejs.org)** — pick the LTS installer
- **[Git](https://git-scm.com)**

Verify:
```powershell
node -v      # v20.x.x or higher
npm -v       # 10.x.x or higher
```

---

### 2. Clone the repository

```powershell
git clone https://github.com/g2ix/registration-system.git
cd registration-system
```

---

### 3. Install dependencies

```powershell
npm install
```

> Takes 1–2 minutes on first run.

---

### 4. Create the environment file

```powershell
copy .env.example .env
```

Open `.env` and set a strong secret for `NEXTAUTH_SECRET`.

**Generate a random secret (PowerShell):**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Your `.env` should look like:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="yourGeneratedSecretHere"
NEXTAUTH_URL="http://localhost:3000"
```

---

### 5. Set up the database

```powershell
npx prisma db push
npm run db:seed
```

This creates `prisma/dev.db` and seeds the default accounts:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `staff` | `staff123` | Staff |
| `election` | `election123` | Election |

> ⚠️ Change passwords after first login via **Admin → User Management**.

---

### 6. Build for production

```powershell
npm run build
```

Compiles all pages (takes ~1–3 min). Only needs to be re-run after code changes.

---

### 7. Start the server

```powershell
npm start
```

| Access | URL |
|--------|-----|
| This machine | `http://localhost:3000` |
| LAN (other devices) | `http://<your-ip>:3000` |

**Find your IP:**
```powershell
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

---

## Daily Use

After first-time setup, just run:

```powershell
cd registration-system
npm start
```

Stop the server with `Ctrl + C`.

---

## Importing Members

1. Log in as **admin**
2. Go to **Upload Members** in the sidebar
3. On that page, choose **Download template**, or upload your own `.csv` or `.xlsx` file with these columns:

| Column | Required | Notes |
|--------|----------|-------|
| `usccmpc_id` | ✅ | Unique member ID |
| `firstName` | ✅ | |
| `lastName` | ✅ | |
| `membership_type` | ✅ | `Regular` or `Associate` |
| `middleName` | optional | |
| `suffix` | optional | Jr., Sr., III, etc. |
| `email1` | optional | |
| `email2` | optional | |
| `contactNumber` | optional | |

> CSV files must be saved as **UTF-8** encoding to preserve ñ and other special characters.

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full access — dashboard, member/user management, backup, logs |
| **Staff** | Attendance page only — check-in and check-out |
| **Election** | Election panel — view checked-in Regular members, mark as voted, export |

---

## Updating to a Newer Version

```powershell
git pull
npm install
npx prisma db push
npm run build
npm start
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Pages load slowly | Make sure you ran `npm run build` before `npm start` |
| `Port 3000 already in use` | Run `npx next start -p 3001` |
| `Database is locked` | Only one `npm start` process should run at a time |
| `NEXTAUTH_SECRET` error | Check that `.env` exists and has a value set |
| `prisma: command not found` | Use `npx prisma` instead of `prisma` |
| Members with ñ not found in search | Search uses accent-insensitive matching — both `n` and `ñ` will match |

---

## Data & Backup

Go to **Admin → Data & Backup** to:

- **Export attendance** as CSV or XLSX (complete report with all columns)
- **Download a full JSON backup** of all members and attendance
- **Restore members** from a previous backup file

---

## License

Internal use — USCCMPC-MPC events only.
