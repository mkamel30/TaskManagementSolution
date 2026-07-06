# Task Management & Bakery Quota Tracker

An Arabic-first web application designed for internal task allocation, comment threads, audit history tracking, and bakery quota management.

---

## 🚀 Technology Stack

* **Frontend**: React 18 (Vite + SWC + TypeScript)
* **Styling**: Tailwind CSS v3 + shadcn/ui (Radix UI primitives)
* **State Management**: TanStack React Query v5 (React Query)
* **Routing**: React Router DOM v6
* **Charts**: Recharts
* **Backend**: Supabase (Postgres Database, Auth, Storage, Edge Functions)
* **Deployment**: Vercel (SPA rewrite rules)
* **Package Manager**: pnpm

---

## ⚙️ Architecture & Features

### 1. Task Management
* **Database-Driven Querying**: All task searching, sorting (by creation date, reminder date, or task number), and filtering (by status, responsible employee, or requesting party) are executed server-side.
* **Server-Side Pagination**: Uses Postgres range pagination to load tasks in batches, ensuring fast initial loads as task records grow.
* **Overdue Notifications**: Displays toast notifications for active overdue tasks based on their reminder dates.
* **Comments & History**: Built-in support for comment threads and task modification history.

### 2. Bakery Quotas allocation
* **Quota Logs**: Operational tracking of bakery allocations with history auditing.
* **System vs. Operational Dates**: Displays both the **Operational Date** (تاريخ تطبيق الحصة) and the **System Entry Date** (تاريخ التسجيل بالنظام) to track retrospectively applied changes.
* **Chunked Excel Imports**: Automated Edge Function (`import-bakery-quotas`) processes large Excel uploads in optimized chunks to prevent request timeouts.

### 3. Security Hardening
* **Route Protection**: Wrap dashboard endpoints in a `<ProtectedRoute>` wrapper to block layout flashes for unauthenticated users.
* **CORS Restrictions**: Both edge functions block unauthorized requests by limiting access to Vercel domains and local dev environments.
* **RLS Policies**: Row Level Security (RLS) is enabled on all tables, including the task sequence tables (`daily_task_sequences`), blocking unauthorized access via public API calls.

### 4. Stability
* **ErrorBoundary Wrapper**: Encloses the React root node, capturing runtime crashes and displaying a clean Arabic fallback page.

---

## 🛠️ Local Development Setup

### Prerequisites
Make sure you have Node.js and `pnpm` installed.

### 1. Install Dependencies
This project uses `pnpm` workspace constraints:
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Fill in your Supabase variables:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:8080` (or the host port output by Vite) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 💾 Database Backup Utility

To safeguard production data, the project includes a zero-dependency local backup utility.

### Running a Backup:
1. Run the script:
   ```bash
   npm run backup
   ```
2. Retrieve your **Service Role Key** from the Supabase Dashboard: **Settings** -> **API** -> **`service_role` (secret)**.
3. Paste the key when prompted in your terminal.
4. The utility will query all tables in chunks and save them as JSON files in a local folder called `supabase_backup/` (which is safely ignored by Git).

Included tables in backup:
* `tasks`
* `task_history`
* `comments`
* `bakery_quotas`
* `bakery_quota_history`
