'use client';
import React, { useState } from 'react';
import { useEcoOps } from '../core/context';
import { calculatePayslip, triggerPDFExport } from '../utils/taxEngine';
import { FrostCard, StatPill } from '../core/frostUi';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';

interface ViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function TechnicianView({ activeTab, setActiveTab }: ViewProps) {
  const { currentUser, work_orders, connections, material_logs, salary_advances, insertTable, updateTable, batchOp } = useEcoOps();

  const [selectedMaterial, setSelectedMaterial] = useState('ADSS Clamps');
  const [materialQty, setMaterialQty] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [activeCompleteWO, setActiveCompleteWO] = useState<any | null>(null);
  const [splicingNotes, setSplicingNotes] = useState('');
  const [powerReading, setPowerReading] = useState('-18.4');

  const myWorkOrders = work_orders.filter(wo => wo.assigned_tech_id === currentUser?.id);
  const myMaterialLogs = material_logs.filter(ml => ml.tech_id === currentUser?.id);
  const myAdvances = salary_advances.filter(sa => sa.tech_id === currentUser?.id);

  const completedWOCount = work_orders.filter(wo => wo.assigned_tech_id === currentUser?.id && wo.status === 'Completed').length;
  const totalConnections = (currentUser?.base_connections || 0) + completedWOCount;

  const approvedAdvances = salary_advances
    .filter(sa => sa.tech_id === currentUser?.id && sa.status === 'Approved')
    .reduce((acc, curr) => acc + curr.amount_requested, 0);

  let expectedPayout = 600000;
  let grade = 'Below Target';

  if (totalConnections >= 100) {
    expectedPayout = 600000 + (totalConnections * 8000);
    grade = 'Star Performer';
  } else if (totalConnections >= 85) {
    expectedPayout = 600000 - 100000;
    grade = 'Below Target';
  } else {
    expectedPayout = Math.max(0, 600000 - ((100 - totalConnections) * 8000));
    grade = 'Critical Review';
  }

  const netPayout = expectedPayout - approvedAdvances;

  const attendanceLogs = fetchAttendanceLedger(currentUser?.id);
  const isCheckedInToday = attendanceLogs.some(a => a.date === new Date().toISOString().split('T')[0]);

  function fetchAttendanceLedger(techId: string | undefined) {
    if (typeof window === 'undefined' || !techId) return [];
    try {
      const db = JSON.parse(localStorage.getItem('ecoops_db') || '{}');
      return (db.attendance_ledger || []).filter((a: any) => a.tech_id === techId);
    } catch (e) { return []; }
  }

  const handleCheckInToday = () => {
    if (!currentUser?.id || isCheckedInToday) return;
    insertTable('attendance_ledger', { tech_id: currentUser?.id, date: new Date().toISOString().split('T')[0], status: 'present' });
  };

  const handleCompleteWorkOrder = () => {
    if (!activeCompleteWO) return;
    batchOp("Logging splicing completions & optical diagnostics...", [
      {
        type: 'update',
        table: 'work_orders',
        id: activeCompleteWO.id,
        data: {
          status: 'Completed',
          completed_at: new Date().toISOString(),
          notes: splicingNotes,
          power_reading: `${powerReading} dBm`
        }
      },
      {
        type: 'update',
        table: 'connections',
        id: activeCompleteWO.connection_id,
        data: {
          ticket_status: 'Completed',
          notes: splicingNotes || `Routed drop fiber successfully. Power: ${powerReading} dBm.`
        }
      }
    ]);
    setActiveCompleteWO(null);
    setSplicingNotes('');
  };

  const progressPct = Math.min(100, Math.round((totalConnections / 100) * 100));

  return (
    <div className="space-y-6">

      {/* KPI Banner — 3 cards, Lumina layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Hero gradient card — contractor identity */}
        <FrostCard className="p-6 !bg-gradient-to-br !from-indigo-600 !to-purple-700 border-none">
          <div className="flex flex-col justify-between h-full min-h-[140px]">
            <div>
              <span className="inline-block text-[10px] font-semibold text-indigo-200 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Contract Performance
              </span>
            </div>
            <div>
              <p className="text-sm text-indigo-200 mb-1">FIT Field Contractor</p>
              <h2 className="text-2xl font-bold text-white">{currentUser?.name}</h2>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-indigo-200">Payroll Status</span>
                <span className="text-sm font-bold text-white">{grade}</span>
              </div>
            </div>
          </div>
        </FrostCard>

        {/* Connections metric card */}
        <FrostCard className="p-6">
          <div className="flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex items-start justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Connections</span>
              <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                totalConnections >= 85
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
              }`}>
                {totalConnections >= 85 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {progressPct}%
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">/ 100 Target</p>
              <h2 className="text-4xl font-bold text-white">{totalConnections}</h2>
              <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </FrostCard>

        {/* Payroll metric card */}
        <FrostCard className="p-6">
          <div className="flex flex-col justify-between h-full min-h-[140px]">
            <div className="flex items-start justify-between">
              <span className="text-xs text-slate-400 font-medium">Expected Net Payroll</span>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">TZS</span>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Base 600K + commissions</p>
              <h2 className="text-3xl font-bold text-white">{netPayout.toLocaleString()}</h2>
            </div>
          </div>
        </FrostCard>

      </div>

      {/* Tab Content */}
      <div>

        {/* TAB 1: WORK ORDERS */}
        {activeTab === 'Work Orders' && (
          <FrostCard className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Active Client Dispatch Orders</h3>
                <p className="text-xs text-slate-500 mt-1">Select assigned subscribers below to log optical diagnostic readings</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                {myWorkOrders.length} Tasks
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myWorkOrders.map((wo: any) => {
                const conn = connections.find(c => c.id === wo.connection_id) || {};
                const isCompleted = wo.status === 'Completed';
                return (
                  <div
                    key={wo.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-white/3 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[10px] text-indigo-400 font-mono mb-0.5">{conn.account_number || 'EES-FTTH-MOCK'}</p>
                        <h4 className="text-sm font-semibold text-white">{conn.client_name}</h4>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        {wo.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-slate-500 mb-4">
                      <p>{conn.location}, Dar es Salaam</p>
                      <p className="font-mono">{conn.contact_phone || '+255 784 553 112'}</p>
                    </div>
                    {isCompleted ? (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                        <p className="text-xs text-emerald-400 font-semibold">✓ Spliced & Verified</p>
                        {wo.power_reading && (
                          <p className="text-[10px] text-slate-500 mt-1 font-mono">Power: {wo.power_reading}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setActiveCompleteWO(wo); setSplicingNotes(''); }}
                        className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                      >
                        Complete & Log Splicing
                      </button>
                    )}
                  </div>
                );
              })}
              {myWorkOrders.length === 0 && (
                <p className="text-slate-500 text-sm col-span-2 py-8 text-center">No assigned client dispatch orders found.</p>
              )}
            </div>
          </FrostCard>
        )}

        {/* TAB 2: LOG MATERIALS */}
        {activeTab === 'Log Materials' && (
          <FrostCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-2">Active Materials Logistics Hub</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Technicians log physical fiber cables, mechanic sleeves, ties, and drops upon successful terminal connectivity.
            </p>
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl">
              <p className="text-xs text-indigo-400 font-semibold mb-2">Auto Logging Integration</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Logistics reporting is integrated with client dispatch. Go to the{' '}
                <button onClick={() => setActiveTab('Work Orders')} className="text-indigo-400 font-semibold hover:underline">
                  Work Orders
                </button>{' '}
                tab, select an assigned task, and submit splicing connection reports to dynamically write logistics inventories.
              </p>
            </div>
          </FrostCard>
        )}

        {/* TAB 3: MATERIAL REQUESTS */}
        {activeTab === 'Material Requests' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            <FrostCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold text-white mb-6">Material Requisition</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Item Title</label>
                  <select
                    value={selectedMaterial}
                    onChange={e => setSelectedMaterial(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  >
                    <option value="ADSS Clamps">ADSS Clamps</option>
                    <option value="J-hooks">J-hooks</option>
                    <option value="UPB Clamps">UPB Clamps</option>
                    <option value="Storage bracket">Storage bracket</option>
                    <option value="Guy Grip 12:24:48core">Guy Grip 12:24:48core</option>
                    <option value="Guy grip 96core">Guy grip 96core</option>
                    <option value="Guy grip 144core">Guy grip 144core</option>
                    <option value="Buckles">Buckles</option>
                    <option value="Cable ties">Cable ties</option>
                    <option value="Steel strap">Steel strap</option>
                    <option value="Drop Cable (meters)">Drop Cable (meters)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Quantity Requested</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={materialQty}
                    onChange={e => setMaterialQty(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Unit</label>
                  <input
                    type="text"
                    value={selectedMaterial.includes('meters') || selectedMaterial.includes('Cable') ? 'meters' : 'pcs'}
                    disabled
                    className="w-full bg-white/3 border border-white/5 text-slate-500 rounded-xl px-3 py-2.5 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const qty = parseInt(materialQty);
                  if (qty > 0) {
                    insertTable('material_logs', { tech_id: currentUser?.id, material_type: selectedMaterial, quantity_requested: qty, status: 'Pending Approval' });
                    setMaterialQty('');
                  }
                }}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors mt-6"
              >
                Request Allocation
              </button>
            </FrostCard>

            <FrostCard className="lg:col-span-3 p-6">
              <h3 className="text-lg font-bold text-white mb-6">Allocation History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-slate-500 font-medium">Date</th>
                      <th className="pb-3 text-slate-500 font-medium">Material</th>
                      <th className="pb-3 text-slate-500 font-medium text-center">Qty</th>
                      <th className="pb-3 text-slate-500 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {myMaterialLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/2">
                        <td className="py-3 text-slate-500 font-mono">{log.created_at ? log.created_at.split('T')[0] : '2026-05-20'}</td>
                        <td className="py-3 text-slate-300 font-medium">{log.material_type}</td>
                        <td className="py-3 text-slate-300 text-center font-mono">{log.quantity_requested}</td>
                        <td className="py-3 text-right">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            log.status === 'Approved'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {myMaterialLogs.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-500">No supply logs registered.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </FrostCard>

          </div>
        )}

        {/* TAB 4: SALARY ADVANCES */}
        {activeTab === 'Salary Advances' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            <FrostCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold text-white mb-6">Request Salary Advance</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Advance Amount (TZS)</label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Reason / Justification</label>
                  <textarea
                    rows={4}
                    placeholder="Explain reason for advance..."
                    value={advanceReason}
                    onChange={e => setAdvanceReason(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600 resize-none"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const amt = parseInt(advanceAmount);
                  if (amt > 0 && advanceReason.trim()) {
                    insertTable('salary_advances', { tech_id: currentUser?.id, amount_requested: amt, reason: advanceReason.trim(), status: 'Pending OM Approval' });
                    setAdvanceAmount('');
                    setAdvanceReason('');
                  }
                }}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors mt-6"
              >
                Submit Advance Request
              </button>
            </FrostCard>

            <FrostCard className="lg:col-span-3 p-6">
              <h3 className="text-lg font-bold text-white mb-6">Advances History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-3 text-slate-500 font-medium">Date</th>
                      <th className="pb-3 text-slate-500 font-medium">Amount</th>
                      <th className="pb-3 text-slate-500 font-medium">Justification</th>
                      <th className="pb-3 text-slate-500 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {myAdvances.map((adv: any) => (
                      <tr key={adv.id} className="hover:bg-white/2">
                        <td className="py-3 text-slate-500 font-mono">{adv.created_at ? adv.created_at.split('T')[0] : '2026-05-18'}</td>
                        <td className="py-3 text-slate-300 font-mono font-medium">{adv.amount_requested.toLocaleString()} TZS</td>
                        <td className="py-3 text-slate-500 italic max-w-[120px] truncate" title={adv.reason}>{adv.reason}</td>
                        <td className="py-3 text-right">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            adv.status === 'Approved'
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          }`}>
                            {adv.status.includes('Approved') ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {myAdvances.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-slate-500">No salary advances registered.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </FrostCard>

          </div>
        )}

        {/* TAB 5: ATTENDANCE LOG */}
        {activeTab === 'Attendance Log' && (
          <FrostCard className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Contract Attendance Ledger</h3>
                <p className="text-xs text-slate-500 mt-1">Daily attendance logging is mandated for payout compliance</p>
              </div>
              <button
                disabled={isCheckedInToday}
                onClick={handleCheckInToday}
                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                  isCheckedInToday
                    ? 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                {isCheckedInToday ? 'Checked In' : 'Mark Today'}
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
              {(() => {
                // Dynamically generate Mon–Sun of the REAL current week
                const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const todayDate = new Date();
                const todayStr = todayDate.toISOString().split('T')[0];
                const dayOfWeek = todayDate.getDay(); // 0=Sun … 6=Sat
                // Calculate how far back Monday is (ISO week: Mon=0 offset)
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const monday = new Date(todayDate);
                monday.setDate(todayDate.getDate() - daysFromMonday);

                return DAY_NAMES.map((name, i) => {
                  const d = new Date(monday);
                  d.setDate(monday.getDate() + i);
                  const dateStr = d.toISOString().split('T')[0];
                  const dayNum = d.getDate();
                  const label = `${name} ${dayNum}`;
                  const isToday = dateStr === todayStr;
                  const isLogged = attendanceLogs.some((a: any) => a.date === dateStr);

                  let bg = 'bg-white/3 border-white/5 text-slate-600';
                  let statusLabel = '—';

                  if (isToday && isCheckedInToday) {
                    bg = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
                    statusLabel = 'Present';
                  } else if (isToday) {
                    bg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                    statusLabel = 'Absent';
                  } else if (isLogged) {
                    bg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    statusLabel = 'Present';
                  }

                  return (
                    <div key={dateStr} className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center min-h-[90px] transition-all ${bg}`}>
                      <span className="text-[10px] font-semibold">{label}</span>
                      <span className="text-[10px] font-bold uppercase">{statusLabel}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </FrostCard>
        )}

      </div>

      {/* MODAL: Complete Work Order */}
      {activeCompleteWO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md"
          >
            <FrostCard className="p-6 shadow-2xl">
              <h3 className="text-base font-semibold text-white mb-1">Complete Splicing Task</h3>
              <p className="text-xs text-indigo-400 mb-6">
                Client: {connections.find(c => c.id === activeCompleteWO.connection_id)?.client_name}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Optical Power Loss Reading (dBm)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={powerReading}
                      onChange={e => setPowerReading(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500/50"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">dBm</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1.5">Compliance limit: {'<'} -25.0 dBm</p>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Splicing & Installation Remarks</label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Completed clean splicing, FAT port power verified."
                    value={splicingNotes}
                    onChange={e => setSplicingNotes(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 resize-none placeholder:text-slate-600"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setActiveCompleteWO(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium py-2.5 rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteWorkOrder}
                  className="flex-1 bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Complete & Save Log
                </button>
              </div>
            </FrostCard>
          </motion.div>
        </div>
      )}

    </div>
  );
}
