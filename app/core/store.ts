// Zero-mock state management / offline sandboxing
// Emulates Supabase via localStorage for this zero-mock environment

export const getDB = () => {
  if (typeof window === 'undefined') return {};
  const db = localStorage.getItem('ecoops_db');
  
  if (db) return JSON.parse(db);

  // Default seeds that perfectly match the executive, OM, and technician dashboards in snapshots
  const seedTechs = [
    { id: 'tech-1', name: 'Juma Hamisi', role: 'Technician', status: 'Approved', salary_grade: 'Grade A', daily_rate: 35000, base_connections: 110, target_connections: 100 },
    { id: 'tech-2', name: 'Peter Temu', role: 'Technician', status: 'Approved', salary_grade: 'Grade B', daily_rate: 30000, base_connections: 85, target_connections: 100 },
    { id: 'tech-3', name: 'Sarah Mushi', role: 'Technician', status: 'Approved', salary_grade: 'Grade B', daily_rate: 30000, base_connections: 63, target_connections: 100 }
  ];

  return {
    users_profiles: [
      { id: 'ceo-1', name: 'Eng. Joseph Lema', role: 'CEO', status: 'Approved' },
      { id: 'pm-1', name: 'Devota John', role: 'Project Manager', status: 'Approved' },
      { id: 'om-1', name: 'Baraka Mwita', role: 'Operations Manager', status: 'Approved' },
      { id: 'sup-1', name: 'Kassim Rajabu', role: 'Supervisor', status: 'Approved' },
      ...seedTechs
    ],
    connections: [
      { id: 'conn-1', account_number: 'EES-FTTH-8091', client_name: 'Azam Food Court', connection_type: 'FTTH', location: 'Kijitonyama', ticket_status: 'Completed', assigned_tech_id: 'tech-1', notes: 'Installation clean. Signal strong.' },
      { id: 'conn-2', account_number: 'EES-FTTH-8092', client_name: 'Mbezi Beach Medical Center', connection_type: 'FTTH', location: 'Mbezi Beach', ticket_status: 'Completed', assigned_tech_id: 'tech-1', notes: 'ONT mounted, drop wire spliced. Verified power.' },
      { id: 'conn-3', account_number: 'EES-FTTH-4451', client_name: 'Upanga Dialysis Clinic', connection_type: 'FTTH', location: 'Upanga', ticket_status: 'Completed', assigned_tech_id: 'tech-1', notes: 'Routed drop fiber flawlessly, splicing successful. Power reading: -18.4 dBm.' },
      { id: 'conn-4', account_number: 'EES-RING-1002', client_name: 'Millennium Tower Office - L9', connection_type: 'RING', location: 'Kijitonyama', ticket_status: 'Completed', assigned_tech_id: 'tech-2', notes: 'Backbone loop connection successful.' },
      { id: 'conn-5', account_number: 'EES-FTTH-3032', client_name: 'White Sands Hotel Resort', connection_type: 'FTTH', location: 'Mbezi Beach', ticket_status: 'Completed', assigned_tech_id: 'tech-2', notes: 'Checklist completed. Power levels checked.' },
      { id: 'conn-6', account_number: 'EES-FTTH-2099', client_name: 'Dar Es Salaam Gymkhana Club', connection_type: 'FTTH', location: 'Upanga', ticket_status: 'Pending', assigned_tech_id: '' },
      { id: 'conn-7', account_number: 'EES-FTTH-7711', client_name: 'Masaki Residences Block B', connection_type: 'FTTH', location: 'Mikocheni', ticket_status: 'Completed', assigned_tech_id: 'tech-3', notes: 'Splicing 48 FO SC box completed.' },
      { id: 'conn-8', account_number: 'EES-FTTH-8854', client_name: 'Shamo Tower Mall', connection_type: 'FTTH', location: 'Mbezi Beach', ticket_status: 'Completed', assigned_tech_id: 'tech-3', notes: 'Standard installation completed.' }
    ],
    work_orders: [
      { id: 'wo-1', connection_id: 'conn-1', assigned_tech_id: 'tech-1', status: 'Completed', completed_at: new Date().toISOString(), checklist: [{ text: "Safety brief", done: true }, { text: "ONT checks", done: true }] },
      { id: 'wo-2', connection_id: 'conn-2', assigned_tech_id: 'tech-1', status: 'Completed', completed_at: new Date().toISOString(), checklist: [{ text: "Safety brief", done: true }, { text: "ONT checks", done: true }] },
      { id: 'wo-3', connection_id: 'conn-3', assigned_tech_id: 'tech-1', status: 'Completed', completed_at: new Date().toISOString(), checklist: [{ text: "Safety brief", done: true }, { text: "ONT checks", done: true }] },
      { id: 'wo-4', connection_id: 'conn-4', assigned_tech_id: 'tech-2', status: 'Completed', completed_at: new Date().toISOString(), checklist: [{ text: "Safety brief", done: true }, { text: "ONT checks", done: true }] },
      { id: 'wo-5', connection_id: 'conn-5', assigned_tech_id: 'tech-2', status: 'Completed', completed_at: new Date().toISOString(), checklist: [{ text: "Safety brief", done: true }, { text: "ONT checks", done: true }] },
      { id: 'wo-6', connection_id: 'conn-7', assigned_tech_id: 'tech-3', status: 'Completed', completed_at: new Date().toISOString(), checklist: [{ text: "Safety brief", done: true }, { text: "ONT checks", done: true }] },
      { id: 'wo-7', connection_id: 'conn-8', assigned_tech_id: 'tech-3', status: 'Completed', completed_at: new Date().toISOString(), checklist: [{ text: "Safety brief", done: true }, { text: "ONT checks", done: true }] }
    ],
    daily_construction_reports: [
      {
        id: 'dcr-1',
        project_name: 'FTTH Fiber Backbone DSM',
        project_type: 'FTTH',
        segment_name: 'Mbezi Beach FTTH Phase 2 Expansion',
        meters_laid: 400,
        fibers_spliced: 8,
        reported_by: 'pm-1',
        supervisor_verified: true,
        verified_by: 'Kassim Rajabu',
        created_at: '2026-05-18T10:00:00.000Z',
        details: { c48: '400', s48: '1', accAdss: '10', accBuckle: '20', poleConc: '5' },
        notes: 'Erected 5 concrete poles on Block D. Installed 400m of 48core primary fiber cable.'
      },
      {
        id: 'dcr-2',
        project_name: 'FTTH Fiber Backbone DSM',
        project_type: 'FTTH',
        segment_name: 'Mbezi Beach FTTH Phase 2 Expansion',
        meters_laid: 400,
        fibers_spliced: 12,
        reported_by: 'pm-1',
        supervisor_verified: true,
        verified_by: 'Kassim Rajabu',
        created_at: '2026-05-19T10:00:00.000Z',
        details: { c48: '400', s96: '1', accTies: '100', accAdss: '10' },
        notes: 'Splicing 48 FO SC box and certified FAT 1-4 power readings.'
      },
      {
        id: 'dcr-3',
        project_name: 'Fiber Ring Network CBD',
        project_type: 'Ring',
        segment_name: 'Dar City Center High-Capacity Ring',
        meters_laid: 1200,
        fibers_spliced: 2,
        reported_by: 'pm-1',
        supervisor_verified: true,
        verified_by: 'Kassim Rajabu',
        created_at: '2026-05-19T12:00:00.000Z',
        details: { c144: '1200', s144: '1' },
        notes: 'Pulled high-fiber 288core from TANESCO sub-station to Posta House.'
      },
      {
        id: 'dcr-4',
        project_name: 'Fiber Ring Network CBD',
        project_type: 'Ring',
        segment_name: 'Dar City Center High-Capacity Ring',
        meters_laid: 3600,
        fibers_spliced: 2,
        reported_by: 'pm-1',
        supervisor_verified: true,
        verified_by: 'Kassim Rajabu',
        created_at: '2026-05-20T10:00:00.000Z',
        details: { c144: '3600', sFat: '2' },
        notes: 'Secured ring junction at Kivukoni Ferry Terminal, tested loss values.'
      }
    ],
    material_logs: [
      { id: 'ml-1', tech_id: 'tech-1', material_type: 'ADSS Clamps', quantity_requested: 50, status: 'Pending Approval', created_at: '2026-05-20T08:00:00.000Z' },
      { id: 'ml-2', tech_id: 'tech-1', material_type: 'ADSS Clamps', quantity_requested: 10, status: 'Pending Approval', created_at: '2026-05-22T08:00:00.000Z' },
      { id: 'ml-3', tech_id: 'tech-1', material_type: 'UPB Clamps', quantity_requested: 2, status: 'Approved', approved_by: 'Baraka Mwita', created_at: '2026-05-18T08:00:00.000Z' }
    ],
    salary_advances: [
      { id: 'sa-1', tech_id: 'tech-1', amount_requested: 150000, reason: 'School fees for children', status: 'Approved', created_at: '2026-05-18T09:00:00.000Z' },
      { id: 'sa-2', tech_id: 'tech-2', amount_requested: 80000, reason: 'Medical emergency', status: 'Approved', created_at: '2026-05-19T09:00:00.000Z' }
    ],
    attendance_ledger: [
      { id: 'att-1', tech_id: 'tech-1', date: '2026-05-18', status: 'present' },
      { id: 'att-2', tech_id: 'tech-1', date: '2026-05-19', status: 'present' },
      { id: 'att-3', tech_id: 'tech-1', date: '2026-05-20', status: 'present' },
      { id: 'att-4', tech_id: 'tech-2', date: '2026-05-18', status: 'present' },
      { id: 'att-5', tech_id: 'tech-2', date: '2026-05-19', status: 'present' },
      { id: 'att-6', tech_id: 'tech-3', date: '2026-05-18', status: 'present' }
    ],
    projects: [
      { id: 'proj-1', name: 'FTTH Fiber Backbone DSM', type: 'FTTH', team: 'Team Kimara Blue', planned_meters: 2000, status: 'active', created_at: new Date().toISOString() },
      { id: 'proj-2', name: 'Fiber Ring Network CBD', type: 'Ring', team: 'Team CBD Metro', planned_meters: 8000, status: 'active', created_at: new Date().toISOString() },
      { id: 'proj-3', name: 'Mikocheni B High-Speed FTTH Feeder', type: 'FTTH', team: 'Team Regent Estates', planned_meters: 1200, status: 'planning', created_at: new Date().toISOString() }
    ],
    inventory: {
      'ADSS Clamps': 350,
      'J-hooks': 400,
      'UPB Clamps': 298,
      'Storage bracket': 130,
      'Guy Grip 12:24:48core': 30,
      'Guy grip 96core': 20,
      'Guy grip 144core': 15,
      'Buckles': 680,
      'Cable ties': 900,
      'Steel strap': 500
    }
  };
};

export const saveDB = (db: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ecoops_db', JSON.stringify(db));
    window.dispatchEvent(new Event('ecoops-state-update'));
  }
};

export const genUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const insertRow = (table: string, row: any) => {
  const db = getDB();
  if (!db[table]) db[table] = [];
  const newRow = { ...row, id: row.id || genUUID(), created_at: new Date().toISOString() };
  db[table].push(newRow);
  saveDB(db);
  return newRow;
};

export const updateRow = (table: string, id: string, updates: any) => {
  const db = getDB();
  if (table === 'inventory') {
    db.inventory = { ...db.inventory, ...updates };
    saveDB(db);
    return db.inventory;
  }
  if (!db[table]) return null;
  const index = db[table].findIndex((r: any) => r.id === id);
  if (index !== -1) {
    db[table][index] = { ...db[table][index], ...updates };
    saveDB(db);
    return db[table][index];
  }
  return null;
};

export const fetchTable = (table: string) => {
  const db = getDB();
  if (table === 'inventory') return db.inventory || {};
  return db[table] || [];
};
