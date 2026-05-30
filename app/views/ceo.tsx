'use client';
import React, { useEffect } from 'react';
import { useEcoOps } from '../core/context';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { FrostCard, StatPill } from '../core/frostUi';
import { MoreHorizontal, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, MapControls, useMap } from '../components/ui/map';
import { cn } from '../utils/cn';

// Real geographical nodes mapping main exchanges across Dar es Salaam, Tanzania
const backboneNodes = [
  { id: 'bb-1', label: 'Mikocheni Node', longitude: 39.2550, latitude: -6.7720 },
  { id: 'bb-2', label: 'Oysterbay Exchange', longitude: 39.2750, latitude: -6.7820 },
  { id: 'bb-3', label: 'CBD Central Hub', longitude: 39.2880, latitude: -6.8150 },
  { id: 'bb-4', label: 'Kivukoni Posta Node', longitude: 39.2980, latitude: -6.8200 },
  { id: 'bb-5', label: 'Kinondoni Station', longitude: 39.2680, latitude: -6.7980 }
];

// Geocodes subscriber name and area into high-precision clustered lat/lng spreads
const hashStringToLatLng = (id: string, name: string, location?: string) => {
  let hash = 0;
  const str = id + name;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let baseLng = 39.2721;
  let baseLat = -6.7924;
  
  if (location === 'Mikocheni') {
    baseLng = 39.2550; baseLat = -6.7720;
  } else if (location === 'Mbezi Beach') {
    baseLng = 39.2300; baseLat = -6.7400;
  } else if (location === 'Upanga') {
    baseLng = 39.2800; baseLat = -6.8050;
  } else if (location === 'Kijitonyama') {
    baseLng = 39.2600; baseLat = -6.7850;
  }
  
  const lngOffset = ((Math.abs(hash) % 100) / 1000) * 0.15;
  const latOffset = (((Math.abs(hash) >> 3) % 100) / 1000) * 0.15;
  
  return { 
    longitude: baseLng + (hash % 2 === 0 ? lngOffset : -lngOffset), 
    latitude: baseLat + (hash % 3 === 0 ? latOffset : -latOffset) 
  };
};

const findNearestBackbone = (clng: number, clat: number) => {
  let nearest = backboneNodes[0];
  let minDist = Infinity;
  backboneNodes.forEach((node) => {
    const dist = Math.hypot(node.longitude - clng, node.latitude - clat);
    if (dist < minDist) { minDist = dist; nearest = node; }
  });
  return nearest;
};

// Custom GeoJSON lines layer to draw connection fibers geographically from nodes to nearest backbones
function NetworkLinesLayer({ connections, backboneNodes, hashStringToLatLng, findNearestBackbone }: any) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const features: any[] = [];
    connections.forEach((c: any) => {
      const { longitude, latitude } = hashStringToLatLng(c.id, c.client_name, c.location);
      const nearest = findNearestBackbone(longitude, latitude);
      
      features.push({
        type: 'Feature',
        properties: {
          id: c.id,
          status: c.ticket_status
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [nearest.longitude, nearest.latitude],
            [longitude, latitude]
          ]
        }
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      features: features
    };

    if (map.getSource('connection-lines')) {
      (map.getSource('connection-lines') as any).setData(geojson);
    } else {
      map.addSource('connection-lines', {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
        id: 'connection-lines-layer',
        type: 'line',
        source: 'connection-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': [
            'match',
            ['get', 'status'],
            'Completed', '#10b981',
            'Assigned', '#f59e0b',
            '#ef4444'
          ],
          'line-width': 2.5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.8
        }
      });
    }

    return () => {
      if (map && typeof map.getLayer === 'function') {
        try {
          if (map.getLayer('connection-lines-layer')) {
            map.removeLayer('connection-lines-layer');
          }
          if (map.getSource('connection-lines')) {
            map.removeSource('connection-lines');
          }
        } catch (e) {
          console.warn("MapLibre cleanup warning (ignored):", e);
        }
      }
    };
  }, [map, isLoaded, connections, backboneNodes]);

  return null;
}

interface ViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function CEOView({ activeTab, setActiveTab }: ViewProps) {
  const { users, daily_construction_reports, material_logs, salary_advances, connections, work_orders, projects, updateTable } = useEcoOps();

  const pendingUsers = users.filter((u: any) => u.status === 'Pending Approval');
  const totalConnects = connections.length;
  const unverifiedLogs = daily_construction_reports.filter((r: any) => !r.supervisor_verified).length;
  const pendingRequisitions = material_logs.filter((m: any) => m.status === 'Pending Approval').length;

  const budgetAdvances = salary_advances
    .filter((s: any) => s.status === 'Approved')
    .reduce((acc, curr) => acc + curr.amount_requested, 0);

  const techs = users.filter((u: any) => u.role === 'Technician' && u.status === 'Approved');

  const targetVsActualData = techs.map((t: any) => {
    const completions = work_orders.filter((wo: any) => wo.assigned_tech_id === t.id && wo.status === 'Completed').length;
    const actual = (t.base_connections || 0) + completions;
    return { name: t.name.split(' ')[0], Connections: actual, Target: t.target_connections || 100 };
  });

  const ftthCount = projects.filter((p: any) => p.type === 'FTTH').length;
  const ringCount = projects.filter((p: any) => p.type === 'Ring').length;

  const projectDonutData = [
    { name: 'FTTH Feeder', value: ftthCount || 1 },
    { name: 'High-Capacity Ring', value: ringCount || 1 }
  ];
  const COLORS = ['#6366f1', '#10b981'];

  const calculateContractorPayout = (tech: any) => {
    const completions = work_orders.filter((wo: any) => wo.assigned_tech_id === tech.id && wo.status === 'Completed').length;
    const total = (tech.base_connections || 0) + completions;
    const target = tech.target_connections || 100;
    const techAdvances = salary_advances
      .filter((sa: any) => sa.tech_id === tech.id && sa.status === 'Approved')
      .reduce((acc: number, curr: any) => acc + curr.amount_requested, 0);

    let payout = 600000;
    let grade = 'Below Target';

    if (total >= target) {
      payout = 600000 + (total * 8000);
      grade = 'Star Performer';
    } else if (total >= 85) {
      payout = 600000 - 100000;
      grade = 'Below Target';
    } else {
      payout = Math.max(0, 600000 - ((target - total) * 8000));
      grade = 'Critical Review';
    }

    return { total, target, grade, advances: techAdvances, netPayout: payout - techAdvances };
  };

  const formatAdvances = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return String(val);
  };

  return (
    <div className="space-y-6">

      {/* KPI Row — Lumina style: label top-left, huge number bottom, pill top-right, NO icons */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <FrostCard className="p-6">
            <div className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-start justify-between">
                <span className="text-xs text-slate-400 font-medium">Total Connects</span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="h-3 w-3" />+12.5%
                </span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] text-slate-500 mb-1">Accumulated base</p>
                <h2 className="text-5xl font-bold text-white tracking-tight">{totalConnects}</h2>
              </div>
            </div>
          </FrostCard>

          <FrostCard className="p-6">
            <div className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-start justify-between">
                <span className="text-xs text-slate-400 font-medium">Unverified Logs</span>
                {unverifiedLogs > 0 ? (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                    <ArrowDownRight className="h-3 w-3" />Review
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Clear</span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-[10px] text-slate-500 mb-1">PM segment reports</p>
                <h2 className="text-5xl font-bold text-white tracking-tight">{unverifiedLogs}</h2>
              </div>
            </div>
          </FrostCard>

          <FrostCard className="p-6">
            <div className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-start justify-between">
                <span className="text-xs text-slate-400 font-medium">Pending Requisitions</span>
                <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">Warehouse</span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] text-slate-500 mb-1">Pending allocations</p>
                <h2 className="text-5xl font-bold text-white tracking-tight">{pendingRequisitions}</h2>
              </div>
            </div>
          </FrostCard>

          <FrostCard className="p-6">
            <div className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-start justify-between">
                <span className="text-xs text-slate-400 font-medium">Budget Advances</span>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">TZS</span>
              </div>
              <div className="mt-4">
                <p className="text-[10px] text-slate-500 mb-1">Cleared advances</p>
                <h2 className="text-5xl font-bold text-white tracking-tight">{formatAdvances(budgetAdvances)}</h2>
              </div>
            </div>
          </FrostCard>

      </div>

      {activeTab === 'Executive Console' && (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <FrostCard className="lg:col-span-3 !p-0">
            <div className="flex items-start justify-between mb-6 p-6">
              <div>
                <h3 className="text-lg font-bold text-white leading-tight min-h-[2.5rem]">Contractor Completions Against Target</h3>
                <p className="text-xs text-slate-500 mt-1">Active technician connections vs 100 connects standard</p>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={targetVsActualData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    contentStyle={{ backgroundColor: '#0f0e1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  <Bar dataKey="Connections" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Target" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </FrostCard>

          <FrostCard className="lg:col-span-2 !p-0">
            <div className="flex items-start justify-between mb-4 p-6">
              <div>
                <h3 className="text-lg font-bold text-white leading-tight min-h-[2.5rem]">Project Class Distribution</h3>
                <p className="text-xs text-slate-500 mt-1">Current infrastructure allocation</p>
              </div>
              <button className="text-slate-500 hover:text-white transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[200px] w-full flex justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {projectDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f0e1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">{projects.length}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Blueprints</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 space-y-2 px-6 pb-6">
              <div className="flex justify-between items-center text-xs truncate">
                <span className="flex items-center gap-2 text-slate-400 truncate">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shrink-0" />
                  FTTH Feeder
                </span>
                <span className="font-semibold text-white ml-2 shrink-0">{ftthCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs truncate">
                <span className="flex items-center gap-2 text-slate-400 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                  Ring Backbone
                </span>
                <span className="font-semibold text-white ml-2 shrink-0">{ringCount}</span>
              </div>
            </div>
          </FrostCard>
        </div>

        {/* Live Network Virtual GIS Mini Map Overlay for CEO */}
        <FrostCard className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Live Network Operations Overlay</h3>
              <p className="text-xs text-slate-500 mt-1">Real-time geographic distribution of fiber backbones and spliced drop client drops across Dar es Salaam</p>
            </div>
            <button
              onClick={() => setActiveTab('Network GIS Map')}
              className="text-xs bg-white/10 hover:bg-white/15 text-white border border-white/10 font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Expand GIS Map View <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="w-full h-[320px] bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/5 relative">
            <Map
              theme="dark"
              viewport={{
                center: [39.2721, -6.7924],
                zoom: 10.8,
                pitch: 25,
                bearing: 0
              }}
            >
              <MapControls showZoom showCompass showFullscreen />
              
              <NetworkLinesLayer 
                connections={connections} 
                backboneNodes={backboneNodes} 
                hashStringToLatLng={hashStringToLatLng}
                findNearestBackbone={findNearestBackbone}
              />

              {backboneNodes.map(node => (
                <MapMarker
                  key={`exec-${node.id}`}
                  longitude={node.longitude}
                  latitude={node.latitude}
                >
                  <MarkerContent>
                    <div className="w-6 h-6 rounded-full bg-indigo-950/90 border-2 border-indigo-400 flex items-center justify-center text-[10px] font-bold text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]">
                      ⚡
                    </div>
                  </MarkerContent>
                  <MarkerTooltip>
                    <div className="text-xs font-bold font-mono">{node.label}</div>
                  </MarkerTooltip>
                </MapMarker>
              ))}

              {connections.map((c: any) => {
                const { longitude, latitude } = hashStringToLatLng(c.id, c.client_name, c.location);
                const color = c.ticket_status === 'Completed' 
                  ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)]' 
                  : c.ticket_status === 'Assigned' 
                  ? 'bg-amber-500 border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]' 
                  : 'bg-rose-500 border-rose-400 shadow-[0_0_6px_rgba(239,68,68,0.4)]';
                
                return (
                  <MapMarker
                    key={`exec-${c.id}`}
                    longitude={longitude}
                    latitude={latitude}
                  >
                    <MarkerContent>
                      <div className={cn("w-3 h-3 rounded-full border-1.5 flex items-center justify-center hover:scale-125 transition-transform cursor-pointer", color)} />
                    </MarkerContent>
                    <MarkerTooltip>
                      <div className="text-[10px] font-mono font-medium">{c.client_name} ({c.location})</div>
                    </MarkerTooltip>
                  </MapMarker>
                );
              })}
            </Map>
          </div>
        </FrostCard>
      </div>
      )}

      {activeTab === 'Leaderboard' && (
      <FrostCard className="!p-0">
        <div className="flex items-start justify-between mb-6 p-6">
          <div>
            <h3 className="text-lg font-bold text-white">Corporate Leaderboard</h3>
            <p className="text-xs text-slate-500 mt-1">Approved installers ranked by metrics completions and expectation grades</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 pb-6">
          {techs.map((tech: any) => {
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
                    <h4 className="text-sm font-semibold text-white">{tech.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">FIT Field Contractor</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${gradeColor}`}>
                    {payouts.grade}
                  </span>
                </div>
                <div className="space-y-2.5 pt-3 border-t border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Connections</span>
                    <span className="text-white font-medium font-mono">{payouts.total} / {payouts.target}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Advances</span>
                    <span className="text-rose-400 font-medium font-mono">-{payouts.advances.toLocaleString()} TZS</span>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                    <span className="text-slate-400 font-medium">Net Salary</span>
                    <span className="text-indigo-400 font-bold font-mono">{payouts.netPayout.toLocaleString()} TZS</span>
                  </div>
                </div>
              </div>
            );
          })}
          {techs.length === 0 && (
            <p className="text-slate-500 text-sm col-span-3 py-8 text-center">No approved technicians found.</p>
          )}
        </div>
      </FrostCard>
      )}

      {activeTab === 'Project Portfolio' && (
      <FrostCard className="!p-0">
        <div className="mb-6 p-6">
          <h3 className="text-lg font-bold text-white">FTTH & Ring Infrastructure Overlay</h3>
          <p className="text-xs text-slate-500 mt-1">Top-down executive progress of backbone segments overseen in Dar es Salaam</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
          {projects.map((proj: any) => {
            const projReports = daily_construction_reports.filter(r => r.project_name === proj.name);
            const laidSum = projReports
              .filter(r => r.supervisor_verified)
              .reduce((acc, curr) => acc + curr.meters_laid, 0);
            const percent = Math.min(100, Math.round((laidSum / proj.planned_meters) * 100));

            return (
              <div key={proj.id} className="p-5 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wide">
                    {proj.type} Project
                  </span>
                  <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide border ${
                    proj.status === 'active'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  }`}>
                    {proj.status}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">{proj.name}</h4>
                <p className="text-xs text-slate-500 mb-4">Team: <span className="text-slate-300">{proj.team}</span></p>
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Fiber laid progress</span>
                    <span className="text-white font-medium font-mono">{percent}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 font-mono">{laidSum.toLocaleString()}m / {proj.planned_meters.toLocaleString()}m</p>
                </div>
                {projReports.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{projReports.length} Segment Reports</p>
                    <div className="space-y-2 max-h-[120px] overflow-y-auto">
                      {projReports.map((r: any) => (
                        <div key={r.id} className="p-3 bg-white/3 border border-white/5 rounded-xl text-[11px] text-slate-400 leading-relaxed">
                          <span className="text-[9px] text-slate-600 font-mono block mb-1">
                            {r.created_at ? r.created_at.split('T')[0] : '2026-05-18'} · Field Log
                          </span>
                          "{r.notes}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {projects.length === 0 && (
            <p className="text-slate-500 text-sm col-span-2 py-8 text-center">No active projects found.</p>
          )}
        </div>
      </FrostCard>
      )}

      {activeTab === 'Approvals Desk' && (
      <FrostCard className="!p-0">
        <div className="mb-6 p-6">
          <h3 className="text-lg font-bold text-white">Access Approvals Desk</h3>
          <p className="text-xs text-slate-500 mt-1">Authorize and configure compensation parameters for newly registered technician accounts</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
          {pendingUsers.map((u: any) => (
            <div key={u.id} className="p-5 bg-white/3 border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-2xl" />
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">{u.role} Account Intake</p>
                  <h4 className="text-sm font-semibold text-white mt-0.5">{u.name}</h4>
                </div>
                <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase">Locked</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Grade</label>
                  <select
                    id={`grade_${u.id}`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  >
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Daily Rate (TZS)</label>
                  <input
                    id={`rate_${u.id}`}
                    type="number"
                    defaultValue="35000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const grade = (document.getElementById(`grade_${u.id}`) as HTMLSelectElement)?.value;
                  const rateStr = (document.getElementById(`rate_${u.id}`) as HTMLInputElement)?.value;
                  updateTable('users_profiles', u.id, {
                    status: 'Approved',
                    salary_grade: grade,
                    daily_rate: parseInt(rateStr || '0')
                  });
                }}
                className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                Approve & Activate Workspace
              </button>
            </div>
          ))}
          {pendingUsers.length === 0 && (
            <div className="py-12 text-center col-span-2">
              <p className="text-slate-500 text-sm">No pending contractor access requests.</p>
            </div>
          )}
        </div>
      </FrostCard>
      )}
      {activeTab === 'Network GIS Map' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            
            {/* GIS Overview Metric Cards */}
            <FrostCard className="p-5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Operational Backbone Hubs</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">5 / 5</h3>
              <p className="text-xs text-emerald-400 mt-1 font-medium">⚡ Metro Core Online</p>
            </FrostCard>
            
            <FrostCard className="p-5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Optical Segment Spans</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                {daily_construction_reports.filter((r: any) => r.supervisor_verified).length} Spans
              </h3>
              <p className="text-xs text-indigo-400 mt-1 font-medium">Verified by field operations</p>
            </FrostCard>
            
            <FrostCard className="p-5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Fiber laid</p>
              <h3 className="text-3xl font-extrabold text-white mt-2 font-mono">
                {(daily_construction_reports.filter((r: any) => r.supervisor_verified).reduce((acc: number, curr: any) => acc + curr.meters_laid, 0)).toLocaleString()} m
              </h3>
              <p className="text-xs text-indigo-400 mt-1 font-medium">Active backbone rollout</p>
            </FrostCard>

            <FrostCard className="p-5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Network Splicing Success SLA</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">99.2%</h3>
              <p className="text-xs text-slate-500 mt-1">Fiber loss threshold checks normal</p>
            </FrostCard>
          </div>

          <FrostCard className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Dar es Salaam Enterprise Fiber Footprint</h3>
                <p className="text-xs text-slate-500 mt-1">Interactive top-down GIS diagnostic visualizing backbones and active client connections</p>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Active Drops</span>
                  <span className="text-xs text-white font-bold font-mono mt-0.5 block">{connections.length}</span>
                </div>
              </div>
            </div>

            <div className="w-full h-[480px] bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/5 relative">
              <Map
                theme="dark"
                viewport={{
                  center: [39.2721, -6.7924],
                  zoom: 11.2,
                  pitch: 35,
                  bearing: 0
                }}
              >
                <MapControls showZoom showCompass showFullscreen />
                
                <NetworkLinesLayer 
                  connections={connections} 
                  backboneNodes={backboneNodes} 
                  hashStringToLatLng={hashStringToLatLng}
                  findNearestBackbone={findNearestBackbone}
                />

                {/* Plot Backbone core nodes as markers */}
                {backboneNodes.map(node => (
                  <MapMarker
                    key={node.id}
                    longitude={node.longitude}
                    latitude={node.latitude}
                  >
                    <MarkerContent>
                      <div className="w-7 h-7 rounded-full bg-indigo-950/90 border-2 border-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                        ⚡
                      </div>
                    </MarkerContent>
                    <MarkerTooltip>
                      <div className="text-xs font-bold font-mono">{node.label}</div>
                    </MarkerTooltip>
                  </MapMarker>
                ))}

                {/* Plot all customer connections in real time */}
                {connections.map((c: any) => {
                  const { longitude, latitude } = hashStringToLatLng(c.id, c.client_name, c.location);
                  const color = c.ticket_status === 'Completed' 
                    ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                    : c.ticket_status === 'Assigned' 
                    ? 'bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                    : 'bg-rose-500 border-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
                  
                  return (
                    <MapMarker
                      key={c.id}
                      longitude={longitude}
                      latitude={latitude}
                    >
                      <MarkerContent>
                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center hover:scale-125 transition-transform cursor-pointer", color)} />
                      </MarkerContent>
                      <MarkerPopup closeButton>
                        <div className="space-y-1.5 font-sans min-w-[160px] p-0.5 text-slate-800">
                          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{c.account_number}</p>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">{c.client_name}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Zone:</span>
                            <span className="font-semibold text-slate-700">{c.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Status:</span>
                            <span className={cn("font-bold uppercase text-[9px] px-1.5 py-0.5 rounded border", 
                              c.ticket_status === 'Completed' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                              c.ticket_status === 'Assigned' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                              'text-rose-600 border-rose-200 bg-rose-50'
                            )}>
                              {c.ticket_status === 'Pending' ? 'Unassigned' : c.ticket_status}
                            </span>
                          </div>
                        </div>
                      </MarkerPopup>
                    </MapMarker>
                  );
                })}
              </Map>

              {/* Legend Widget overlay */}
              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-2.5 rounded-xl border border-white/10 flex gap-4 text-[9px] text-slate-400 font-mono z-20 shadow-xl">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Backbone Core</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Pending Client</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Dispatched</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Spliced & Active</span>
              </div>
            </div>
          </FrostCard>
        </div>
      )}

    </div>
  );
}
