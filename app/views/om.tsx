'use client';
import React from 'react';
import { useEcoOps } from '../core/context';
import { FrostCard } from '../core/frostUi';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function OMView({ activeTab, setActiveTab }: ViewProps) {
  const { currentUser, material_logs, salary_advances, users, work_orders, inventory, updateTable } = useEcoOps();

  const pendingMaterials = material_logs.filter((m: any) => m.status === 'Pending Approval');
  const pendingAdvances = salary_advances.filter((s: any) => s.status === 'Pending OM Approval');
  const activeTechs = users.filter((u: any) => u.role === 'Technician' && u.status === 'Approved');
  const pendingMaterialCount = pendingMaterials.length;
  const pendingAdvanceCount = pendingAdvances.length;

  const handleApproveMaterial = (log: any) => {
    if (inventory && inventory[log.material_type] !== undefined) {
      const newStock = Math.max(0, inventory[log.material_type] - log.quantity_requested);
      updateTable('inventory', '', { [log.material_type]: newStock });
    }
    updateTable('material_logs', log.id, { status: 'Approved', approved_by: currentUser?.name || 'OM' });
  };

  const handleApproveAdvance = (adv: any) => {
    updateTable('salary_advances', adv.id, { status: 'Approved', approved_by: currentUser?.name || 'OM' });
  };

  const calculateContractorPayout = (tech: any) => {
    const completions = work_orders.filter((wo: any) => wo.assigned_tech_id === tech.id && wo.status === 'Completed').length;
    const totalConnections = (tech.base_connections || 0) + completions;
    const target = tech.target_connections || 100;
    const techAdvances = salary_advances
      .filter((sa: any) => sa.tech_id === tech.id && sa.status === 'Approved')
      .reduce((acc: number, curr: any) => acc + curr.amount_requested, 0);

    let payout = 600000;
    let formula = '';
    let grade = 'Below Target';

    if (totalConnections >= target) {
      payout = 600000 + (totalConnections * 8000);
      formula = `Base + (${totalConnections} × 8K TZS)`;
      grade = 'Star Performer';
    } else if (totalConnections >= 85) {
      payout = 600000 - 100000;
      formula = `Base − 100K Flat Deduction`;
      grade = 'Below Target';
    } else {
      payout = Math.max(0, 600000 - ((target - totalConnections) * 8000));
      formula = `Base − ((${target}−${totalConnections}) × 8K)`;
      grade = 'Critical Review';
    }

    return { totalConnections, target, formula, grade, payout, advances: techAdvances, netPayout: payout - techAdvances };
  };

  return (
    <div className="space-y-6">

      {/* TAB 1: OVERSIGHT METRICS */}
      {activeTab === 'Oversight Metrics' && (
        <div className="space-y-6">

          {/* KPI Row — Lumina style, no icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <FrostCard className="p-6">
              <div className="flex flex-col justify-between min-h-[130px]">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-slate-400 font-medium">Logistics Approvals</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pendingMaterialCount === 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                    {pendingMaterialCount === 0 ? 'Clear' : 'Pending'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Pending requisitions</p>
                  <h2 className="text-4xl font-bold text-white">{pendingMaterialCount}</h2>
                  <button
                    onClick={() => setActiveTab('Material Approvals')}
                    className="mt-3 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    Review queue <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </FrostCard>

            <FrostCard className="p-6">
              <div className="flex flex-col justify-between min-h-[130px]">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-slate-400 font-medium">Financial Advances</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pendingAdvanceCount === 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                    {pendingAdvanceCount === 0 ? 'Clear' : 'Pending'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Advance requests</p>
                  <h2 className="text-4xl font-bold text-white">{pendingAdvanceCount}</h2>
                  <button
                    onClick={() => setActiveTab('Advance Requests')}
                    className="mt-3 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    Audit advances <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </FrostCard>

            <FrostCard className="p-6">
              <div className="flex flex-col justify-between min-h-[130px]">
                <div className="flex items-start justify-between">
                  <span className="text-xs text-slate-400 font-medium">Pipeline Status</span>
                  <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Live</span>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">Cross-tab sync</p>
                  <h2 className="text-lg font-semibold text-white">Splicing Active</h2>
                  <p className="text-[10px] text-slate-500 mt-2">Synchronized instantly</p>
                </div>
              </div>
            </FrostCard>

          </div>

          {/* Crew production cards */}
          <FrostCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-6">Crew Production Output Index</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeTechs.map((tech: any) => {
                const payouts = calculateContractorPayout(tech);
                const gradeColor = payouts.grade === 'Star Performer'
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : payouts.grade === 'Below Target'
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                return (
                  <div key={tech.id} className="p-5 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[10px] text-slate-500 font-mono">{tech.id?.toUpperCase?.()}</p>
                        <h4 className="text-sm font-semibold text-white mt-0.5">{tech.name}</h4>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${gradeColor}`}>
                        {payouts.grade}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Connections</span>
                        <span className="text-white font-medium font-mono">{payouts.totalConnections} / 100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Net Payout</span>
                        <span className="text-indigo-400 font-medium font-mono">{payouts.netPayout.toLocaleString()} TZS</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activeTechs.length === 0 && (
                <p className="text-slate-500 text-sm col-span-3 py-6 text-center">No approved technicians found.</p>
              )}
            </div>
          </FrostCard>
        </div>
      )}

      {/* TAB 2: PAYROLL SIMULATOR */}
      {activeTab === 'Payroll Simulator' && (
        <FrostCard className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-5 border-b border-white/5">
            <div>
              <h3 className="text-lg font-bold text-white">Tanzanian Contractor Payroll Engine</h3>
              <p className="text-xs text-slate-500 mt-1">Real-time simulation based on standard connection criteria formulas</p>
            </div>
            <div className="flex gap-2">
              {[['Base Pay', '600K TZS'], ['Per Connect', '8K TZS'], ['Target', '100 Conn.']].map(([label, val]) => (
                <div key={label} className="px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 uppercase block">{label}</span>
                  <span className="text-xs text-white font-semibold mt-0.5 block">{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-slate-500 font-medium">Technician</th>
                  <th className="pb-3 text-slate-500 font-medium">Connections</th>
                  <th className="pb-3 text-slate-500 font-medium">Formula</th>
                  <th className="pb-3 text-slate-500 font-medium">Grade</th>
                  <th className="pb-3 text-slate-500 font-medium text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeTechs.map((tech: any) => {
                  const p = calculateContractorPayout(tech);
                  const gradeColor = p.grade === 'Star Performer' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : p.grade === 'Below Target' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                  return (
                    <tr key={tech.id} className="hover:bg-white/2">
                      <td className="py-3.5">
                        <span className="text-white font-medium">{tech.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{tech.id}</span>
                      </td>
                      <td className="py-3.5 text-white font-mono font-medium">{p.totalConnections}<span className="text-slate-500"> / {p.target}</span></td>
                      <td className="py-3.5 text-slate-400 font-mono">{p.formula}</td>
                      <td className="py-3.5">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${gradeColor}`}>{p.grade}</span>
                      </td>
                      <td className="py-3.5 text-right">
                        <span className="text-indigo-400 font-bold font-mono">{p.netPayout.toLocaleString()} TZS</span>
                        {p.advances > 0 && (
                          <span className="text-[9px] text-rose-400 block mt-0.5 font-mono">−{p.advances.toLocaleString()} advance</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {activeTechs.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No approved technicians.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </FrostCard>
      )}

      {/* TAB 3: MATERIAL APPROVALS */}
      {activeTab === 'Material Approvals' && (
        <FrostCard className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Logistics Supply Allocation Queue</h3>
            <p className="text-xs text-slate-500 mt-1">Approving automatically deducts quantities from the warehouse stock ledger</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-slate-500 font-medium">Requested For</th>
                  <th className="pb-3 text-slate-500 font-medium">Item & Qty</th>
                  <th className="pb-3 text-slate-500 font-medium">Date</th>
                  <th className="pb-3 text-slate-500 font-medium">Status</th>
                  <th className="pb-3 text-slate-500 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {material_logs.map((log: any) => {
                  const tech = users.find(u => u.id === log.tech_id);
                  const isPending = log.status === 'Pending Approval';
                  return (
                    <tr key={log.id} className="hover:bg-white/2">
                      <td className="py-3.5">
                        <span className="text-white font-medium">{tech?.name || 'Field Installer'}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Contractor</span>
                      </td>
                      <td className="py-3.5 text-slate-300 font-mono">{log.quantity_requested} × {log.material_type}</td>
                      <td className="py-3.5 text-slate-500 font-mono">{log.created_at ? log.created_at.split('T')[0] : '2026-05-20'}</td>
                      <td className="py-3.5">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isPending ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                          {isPending ? 'Pending' : 'Approved'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {isPending ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleApproveMaterial(log)} className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-3 py-1.5 rounded-lg text-[10px] transition-colors">
                              Approve
                            </button>
                            <button onClick={() => updateTable('material_logs', log.id, { status: 'Rejected', approved_by: currentUser?.name })} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold px-3 py-1.5 rounded-lg text-[10px] transition-colors">
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">By {log.approved_by || 'OM'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {material_logs.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No supply logs registered.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </FrostCard>
      )}

      {/* TAB 4: ADVANCE REQUESTS */}
      {activeTab === 'Advance Requests' && (
        <FrostCard className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Cash Advance Audit Queue</h3>
            <p className="text-xs text-slate-500 mt-1">Review money advances logged by field operations for emergencies or medical assistance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-slate-500 font-medium">Contractor</th>
                  <th className="pb-3 text-slate-500 font-medium">Amount</th>
                  <th className="pb-3 text-slate-500 font-medium">Reason</th>
                  <th className="pb-3 text-slate-500 font-medium">Status</th>
                  <th className="pb-3 text-slate-500 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {salary_advances.map((adv: any) => {
                  const tech = users.find(u => u.id === adv.tech_id);
                  const isPending = adv.status.includes('Pending');
                  return (
                    <tr key={adv.id} className="hover:bg-white/2">
                      <td className="py-3.5 text-white font-medium">{tech?.name || 'Field Crew'}</td>
                      <td className="py-3.5 text-white font-mono font-semibold">{adv.amount_requested.toLocaleString()} TZS</td>
                      <td className="py-3.5 text-slate-400 italic max-w-[180px] truncate" title={adv.reason}>{adv.reason}</td>
                      <td className="py-3.5">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isPending ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                          {isPending ? 'Pending' : 'Approved'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {isPending ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleApproveAdvance(adv)} className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-3 py-1.5 rounded-lg text-[10px] transition-colors">
                              Approve
                            </button>
                            <button onClick={() => updateTable('salary_advances', adv.id, { status: 'Rejected' })} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold px-3 py-1.5 rounded-lg text-[10px] transition-colors">
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-semibold">Cleared</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {salary_advances.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No advances logged.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </FrostCard>
      )}

      {/* Warehouse Inventory — persistent at bottom */}
      <FrostCard className="p-6">
        <h3 className="text-lg font-bold text-white mb-5">Warehouse Logistics Reserves</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Object.keys(inventory || {}).map((key: string) => (
            <div key={key} className="p-4 bg-white/3 border border-white/5 rounded-2xl">
              <p className="text-[10px] text-slate-500 font-medium truncate" title={key}>{key}</p>
              <p className="text-xl font-bold text-emerald-400 mt-2 font-mono">
                {inventory[key].toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">units</span>
              </p>
            </div>
          ))}
          {Object.keys(inventory || {}).length === 0 && (
            <p className="text-slate-500 text-sm col-span-5 py-6 text-center">No inventory data found.</p>
          )}
        </div>
      </FrostCard>

    </div>
  );
}
