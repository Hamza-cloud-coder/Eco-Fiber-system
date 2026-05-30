# EcoOps Suite — Enterprise Fiber Operations Hub

Welcome to the **EcoOps Enterprise Suite**, a premium, glassmorphic Next.js 15 application built to streamline fiber network rollouts, dispatch logistics, payroll calculations, and geographical GIS tracking across Dar es Salaam, Tanzania.

---

## ⚡ Quick Start (Setup Instructions)

### Prerequisites
* Ensure you have **Node.js** (v18 or higher recommended) installed.

### 1. Install Dependencies
Extract the ZIP archive, open your terminal in the project directory, and download the packages:
```bash
npm install
```
*(Note: This downloads Maplibre GL, Recharts, Framer Motion, and Tailwind CSS tools instantly).*

### 2. Start the Development Server
Launch the local Hot Module Replacement (HMR) environment:
```bash
npm run dev
```
* Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

### 3. Verify Production Build
To ensure that all assets optimize cleanly for deployment:
```bash
npm run build
```

---

## 🛠️ Dashboard Architecture & Test Flows

The application simulates an offline sandboxed Supabase environment using a `localStorage` database state machine (`app/core/store.ts`). You can test the entire lifecycle of a fiber splicing rollout step-by-step:

### Flow 1: Dispatch & Crew Assignment
1. Log in as a **Dispatch Officer** (Enter any name, select `Dispatch`).
2. Go to **Client Onboarding** and register a new corporate client. The system deterministically maps their coordinates (`hashStringToLatLng`) in Dar es Salaam.
3. Go to the **Dispatch Queue**, select an approved technician (e.g. `Juma Hamisi`), and click **Assign**. This automatically generates a PPE compliance checklist and registers a live `work_orders` log.

### Flow 2: Splicing Connectivity & Attendance
1. Sign out and log back in as a **Technician** (e.g. name `Juma Hamisi`, select `Technician`).
2. Go to **Attendance Log** and mark today's check-in to confirm payout compliance.
3. Go to **Work Orders**, select your new dispatch task, and click **Complete & Log Splicing**. Set the optical loss reading (e.g. `-19.2 dBm`) and submit.
4. Go to **Material Requests** and request some `ADSS Clamps` for logistics allocation.

### Flow 3: Supervisor Logistics Audit
1. Log in as a **Supervisor** (e.g. name `Kassim Rajabu`, select `Supervisor`).
2. Go to **Verify Logistics** to audit the technician's completed splicing task and mark it as verified.
3. Track active installer crews in real time on the **Field Dispatch Map** which plots live service vehicle markers (`🚗`).

### Flow 4: Operations Manager Approvals & Payroll
1. Log in as the **Operations Manager** (e.g. name `Baraka Mwita`, select `Operations Manager`).
2. Go to **Material Approvals** and approve the pending clamps. This automatically deducts raw reserves from the **Warehouse Logistics Reserves** ledger with stock limit checks.
3. Go to **Payroll Simulator** to see the Tanzanian payout calculations (600K TZS base +/- Commission multipliers and Cleared cash advances) computed for each contractor crew.

### Flow 5: CEO Executive Oversight Console
1. Log in as the **CEO** (e.g. name `Eng. Joseph Lema`, select `CEO`).
2. Review the **Executive Console** KPIs. Notice the **Live Network Operations Overlay** mini-map displaying backbone exchanges (Mikocheni, Kinondoni, CBD) and live drops.
3. Go to the **Approvals Desk** to authorize compensation parameters (Grade A/B and Daily Rates) for newly signed-up installer profiles.

---

## 🗺️ GIS Mapping & Core Technologies

* **Mapping Engine**: Fully interactive Maplibre GL map integrations (`app/components/ui/map.tsx`).
* **Visual Styling**: Glassmorphic dark cards (`FrostCard` / `LuminaCard`) rendering over a sleek light-theme background, complete with animated border-beams.
* **State Machine**: Sandbox Supabase Emulator (`app/core/context.tsx` and `app/core/store.ts`) synchronized reactively across cross-tab storage nodes.
