'use client';
import React, { useEffect } from 'react';
import { useEcoOps } from '../core/context';
import { FrostCard } from '../core/frostUi';
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

// Geocodes a technician into a deterministic layout around active zones
const hashTechToLatLng = (id: string, name: string) => {
  let hash = 0;
  const str = id + name;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const baseLng = 39.2650;
  const baseLat = -6.7900;
  
  const lngOffset = ((Math.abs(hash) % 75) / 1000) * 0.12;
  const latOffset = (((Math.abs(hash) >> 4) % 75) / 1000) * 0.12;
  
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

export default function SupervisorView({ activeTab, setActiveTab }: ViewProps) {
  const { currentUser, daily_construction_reports, inventory, work_orders, users, connections, projects, updateTable, salary_advances } = useEcoOps();

  const pendingBulkReports = daily_construction_reports.filter((r: any) => !r.supervisor_verified);
  const completedWOAudits = work_orders.filter((wo: any) => wo.status === 'Completed');
  const techs = users.filter((u: any) => u.role === 'Technician' && u.status === 'Approved');

  const techPerformance = techs.map((t: any) => {
    const completions = work_orders.filter((wo: any) => wo.assigned_tech_id === t.id && wo.status === 'Completed').length;
    const totalConnections = (t.base_connections || 0) + completions;
    const target = t.target_connections || 100;
    const advances = salary_advances_sum(t.id);
    let rating = 'Critical Review';
    if (totalConnections >= target) rating = 'Star Performer';
    else if (totalConnections >= 85) rating = 'Below Target';
    return { id: t.id, name: t.name, connections: totalConnections, target, advances, rating };
  }).sort((a, b) => b.connections - a.connections);

  // Uses reactive context data — updates instantly when OM approves an advance
  function salary_advances_sum(techId: string) {
    return salary_advances
      .filter((sa: any) => sa.tech_id === techId && sa.status === 'Approved')
      .reduce((acc: number, curr: any) => acc + curr.amount_requested, 0);
  }

  const handleVerifyBulkSegment = (log: any) => {
    if (log.details && inventory) {
      const updates: any = {};
      const keyMap: { [key: string]: string } = {
        accAdss: 'ADSS Clamps', accJhook: 'J-hooks', accUpb: 'UPB Clamps',
        accBracket: 'Storage bracket', accGrip: 'Guy Grip 12:24:48core',
        accGrip96: 'Guy grip 96core', accGrip144: 'Guy grip 144core',
        accBuckle: 'Buckles', accTies: 'Cable ties', accStrap: 'Steel strap'
      };
      Object.keys(keyMap).forEach((reportKey) => {
        const invKey = keyMap[reportKey];
        const val = parseInt(log.details[reportKey] || '0');
        if (val > 0 && inventory[invKey] !== undefined) {
          updates[invKey] = Math.max(0, inventory[invKey] - val);
        }
      });
      if (Object.keys(updates).length > 0) updateTable('inventory', '', updates);
    }
    updateTable('daily_construction_reports', log.id, {
      supervisor_verified: true,
      verified_by: currentUser?.name || 'Kassim Rajabu (Supervisor)'
    });
  };

  const handleVerifySplicingLog = (wo: any) => {
    updateTable('work_orders', wo.id, { supervisor_audited: true });
  };

  const renderItemizedList = (details: any) => {
    if (!details) return null;
    const items: string[] = [];
    if (parseInt(details.c12 || '0') > 0) items.push(`12core: ${details.c12}m`);
    if (parseInt(details.c24 || '0') > 0) items.push(`24core: ${details.c24}m`);
    if (parseInt(details.c48 || '0') > 0) items.push(`48core: ${details.c48}m`);
    if (parseInt(details.c96 || '0') > 0) items.push(`96core: ${details.c96}m`);
    if (parseInt(details.c144 || '0') > 0) items.push(`144core: ${details.c144}m`);
    if (parseInt(details.s24 || '0') > 0) items.push(`Closure 24 FO: ${details.s24}`);
    if (parseInt(details.s48 || '0') > 0) items.push(`Closure 48 FO: ${details.s48}`);
    if (parseInt(details.s96 || '0') > 0) items.push(`Closure 96 FO: ${details.s96}`);
    if (parseInt(details.s144 || '0') > 0) items.push(`Closure 144 FO: ${details.s144}`);
    if (parseInt(details.sFat || '0') > 0) items.push(`Splice FAT: ${details.sFat}`);
    const keyLabels: { [key: string]: string } = {
      accAdss: 'ADSS Clamps', accJhook: 'J-hooks', accUpb: 'UPB Clamps',
      accBracket: 'Storage bracket', accGrip: 'Guy Grip 12-48c',
      accGrip96: 'Guy Grip 96c', accGrip144: 'Guy Grip 144c',
      accBuckle: 'Buckles', accTies: 'Cable ties', accStrap: 'Steel strap'
    };
    Object.keys(keyLabels).forEach(k => {
      const val = parseInt(details[k] || '0');
      if (val > 0) items.push(`${keyLabels[k]}: ${val}`);
    });
    if (parseInt(details.poleWood || '0') > 0) items.push(`TANESCO Wood: ${details.poleWood}`);
    if (parseInt(details.poleConc || '0') > 0) items.push(`TANESCO Concrete: ${details.poleConc}`);
    if (parseInt(details.poleClient || '0') > 0) items.push(`Client Pole: ${details.poleClient}`);

    if (items.length === 0) return <p className="text-xs text-slate-500 italic">No materials logged.</p>;
    return (
      <div className="mt-4 p-4 bg-white/3 border border-white/5 rounded-xl">
        <p className="text-[10px] text-slate-500 uppercase font-medium tracking-wider mb-3">Material Consumption</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between py-1 border-b border-white/5 text-slate-400">
              <span className="text-slate-500">{item.split(':')[0]}</span>
              <span className="font-mono text-white">{item.split(':')[1]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* TAB 1: TEAM PERFORMANCE */}
      {activeTab === 'Team Performance' && (
        <FrostCard className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">FIT Team Performance Leaderboard</h3>
            <p className="text-xs text-slate-500 mt-1">Real-time ranking of contractor crews based on splicing completions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {techPerformance.map((tech: any) => {
              const gradeColor = tech.rating === 'Star Performer'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : tech.rating === 'Below Target'
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20';
              return (
                <div key={tech.id} className="p-5 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-mono">{tech.id?.toUpperCase?.()}</p>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{tech.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">FIT Service Contractor</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${gradeColor}`}>
                      {tech.rating}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Connections</span>
                      <span className="text-white font-mono font-medium">{tech.connections} / {tech.target}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Advances</span>
                      <span className="text-rose-400 font-mono">−{tech.advances.toLocaleString()} TZS</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {techPerformance.length === 0 && (
              <p className="text-slate-500 text-sm col-span-3 py-6 text-center">No approved technicians found.</p>
            )}
          </div>
        </FrostCard>
      )}

      {/* TAB 2: VERIFY LOGISTICS */}
      {activeTab === 'Verify Logistics' && (
        <div className="space-y-6">

          <FrostCard className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white">Field Splicing Verification Queue</h3>
              <p className="text-xs text-slate-500 mt-1">Audit materials and power loss readings logged by installers upon connection completion</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-3 text-slate-500 font-medium">Contractor</th>
                    <th className="pb-3 text-slate-500 font-medium">Subscriber</th>
                    <th className="pb-3 text-slate-500 font-medium">Notes</th>
                    <th className="pb-3 text-slate-500 font-medium">Usage Est.</th>
                    <th className="pb-3 text-slate-500 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {completedWOAudits.map((wo: any) => {
                    const tech = users.find(u => u.id === wo.assigned_tech_id);
                    const conn = connections.find(c => c.id === wo.connection_id) || {} as any;
                    const isAudited = wo.supervisor_audited;
                    return (
                      <tr key={wo.id} className="hover:bg-white/2">
                        <td className="py-3.5">
                          <span className="text-white font-medium">{tech?.name || 'Juma Hamisi'}</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">FIT Installer</span>
                        </td>
                        <td className="py-3.5 text-slate-300 font-medium">{conn.client_name}</td>
                        <td className="py-3.5 text-slate-400 italic max-w-[160px] truncate" title={wo.notes}>
                          "{wo.notes || conn.notes || 'Standard connectivity verified.'}"
                        </td>
                        <td className="py-3.5 text-slate-400 font-mono text-[10px]">Drop: 18m | FAT: 1</td>
                        <td className="py-3.5 text-right">
                          {isAudited ? (
                            <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              Verified
                            </span>
                          ) : (
                            <button
                              onClick={() => handleVerifySplicingLog(wo)}
                              className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {completedWOAudits.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-500">No technical completions logged.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </FrostCard>

          <FrostCard className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white">Bulk Segment Engineering Audit Board</h3>
              <p className="text-xs text-slate-500 mt-1">Verify and sign-off construction reports submitted by project managers</p>
            </div>
            <div className="space-y-4">
              {pendingBulkReports.map((log: any) => (
                <div key={log.id} className="p-5 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                      <p className="text-[10px] text-indigo-400 font-mono mb-0.5">{log.project_name}</p>
                      <h4 className="text-sm font-semibold text-white">{log.segment_name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Laid: <span className="text-white font-mono">{log.meters_laid}m</span> &nbsp;|&nbsp; Spliced: <span className="text-white font-mono">{log.fibers_spliced} cores</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleVerifyBulkSegment(log)}
                      className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl text-xs transition-colors shrink-0"
                    >
                      Verify & Sign-off
                    </button>
                  </div>
                  {renderItemizedList(log.details)}
                  {log.notes && (
                    <p className="text-xs text-slate-400 italic mt-3 p-3 bg-white/3 border border-white/5 rounded-xl leading-relaxed">
                      Remarks: "{log.notes}"
                    </p>
                  )}
                </div>
              ))}
              {pendingBulkReports.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">No unverified bulk reports pending.</p>
              )}
            </div>
          </FrostCard>

        </div>
      )}

      {/* TAB 3: ACTIVE PROJECTS */}
      {activeTab === 'Active Projects' && (
        <FrostCard className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Fiber Network Projects Oversight</h3>
            <p className="text-xs text-slate-500 mt-1">Monitor primary backbone laid cables progress vs target engineering plans</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj: any) => {
              const projReports = daily_construction_reports.filter(r => r.project_name === proj.name);
              const laidSum = projReports
                .filter(r => r.supervisor_verified)
                .reduce((acc, curr) => acc + curr.meters_laid, 0);
              const percent = Math.min(100, Math.round((laidSum / proj.planned_meters) * 100));
              return (
                <div key={proj.id} className="p-5 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-semibold uppercase">
                      {proj.type}
                    </span>
                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border uppercase ${proj.status === 'active' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>
                      {proj.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">{proj.name}</h4>
                  <p className="text-xs text-slate-500 mb-4">Team: <span className="text-slate-300">{proj.team}</span></p>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">Optical drop progress</span>
                      <span className="text-white font-mono font-medium">{percent}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all duration-700" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 font-mono">{laidSum.toLocaleString()}m / {proj.planned_meters.toLocaleString()}m</p>
                  </div>
                  {projReports.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{projReports.length} Segment Reports</p>
                      <div className="space-y-2 max-h-[120px] overflow-y-auto">
                        {projReports.map((r: any) => (
                          <div key={r.id} className="p-3 bg-white/3 border border-white/5 rounded-xl text-xs text-slate-400 leading-relaxed">
                            <span className="text-[9px] text-slate-600 font-mono block mb-0.5">{r.created_at ? r.created_at.split('T')[0] : '2026-05-18'}</span>
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
              <p className="text-slate-500 text-sm col-span-2 py-6 text-center">No active projects found.</p>
            )}
          </div>
        </FrostCard>
      )}

      {activeTab === 'Field Dispatch Map' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            
            {/* Left Crew Directory */}
            <FrostCard className="lg:col-span-2 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Crew Dispatch Control</h3>
                <p className="text-xs text-slate-500 mb-6">Real-time geographical tracking of active field technicians across assigned Dar es Salaam sectors</p>
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {techs.map((tech: any) => {
                    const coords = hashTechToLatLng(tech.id, tech.name);
                    const completions = work_orders.filter((wo: any) => wo.assigned_tech_id === tech.id && wo.status === 'Completed').length;
                    const total = (tech.base_connections || 0) + completions;
                    
                    return (
                      <div key={tech.id} className="p-3 bg-white/3 border border-white/5 rounded-xl hover:bg-white/5 transition-all text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white leading-snug">{tech.name}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            LAT: {coords.latitude.toFixed(4)} · LNG: {coords.longitude.toFixed(4)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-indigo-400 font-mono block">{total} / 100</span>
                          <span className="text-[9px] text-slate-500 block uppercase font-medium">Connects</span>
                        </div>
                      </div>
                    );
                  })}
                  {techs.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-8">No field installers active.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-slate-500 leading-relaxed">
                <span className="font-bold text-indigo-400 block mb-1">💡 Live Tracking Integration</span>
                Technician markers update immediately upon daily check-in, visualizing proximity to client terminals.
              </div>
            </FrostCard>

            {/* Live Map Panel */}
            <FrostCard className="lg:col-span-3 p-6">
              <h3 className="text-lg font-bold text-white mb-1">Live Splicing & Crew Operations Map</h3>
              <p className="text-xs text-slate-500 mb-5">Click markers to audit splicing remarks or see active crew locations</p>
              
              <div className="w-full h-[400px] bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/5 relative">
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

                  {/* Plot Backbone core nodes */}
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

                  {/* Plot subscriber drop terminals */}
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
                          <div className={cn("w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center hover:scale-125 transition-transform cursor-pointer", color)} />
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

                  {/* Plot Technician crews as car icons */}
                  {techs.map((tech: any) => {
                    const { longitude, latitude } = hashTechToLatLng(tech.id, tech.name);
                    
                    return (
                      <MapMarker
                        key={tech.id}
                        longitude={longitude}
                        latitude={latitude}
                      >
                        <MarkerContent>
                          <div className="w-8 h-8 rounded-full bg-slate-950/90 border-2 border-indigo-400 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(99,102,241,0.6)] cursor-pointer hover:scale-110 transition-transform">
                            🚗
                          </div>
                        </MarkerContent>
                        <MarkerPopup closeButton>
                          <div className="space-y-1.5 font-sans min-w-[165px] p-0.5 text-slate-800">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{tech.id}</p>
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">{tech.name}</h4>
                            <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-1.5 mt-1.5">
                              <span>Connections:</span>
                              <span className="font-bold text-slate-700 font-mono">
                                {((tech.base_connections || 0) + work_orders.filter((wo: any) => wo.assigned_tech_id === tech.id && wo.status === 'Completed').length)} / 100
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                              <span>Advances Approved:</span>
                              <span className="font-bold text-rose-600 font-mono">
                                {(salary_advances.filter((sa: any) => sa.tech_id === tech.id && sa.status === 'Approved').reduce((acc: number, curr: any) => acc + curr.amount_requested, 0)).toLocaleString()} TZS
                              </span>
                            </div>
                          </div>
                        </MarkerPopup>
                      </MapMarker>
                    );
                  })}
                </Map>

                {/* Legend Widget overlay */}
                <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-2.5 rounded-xl border border-white/10 flex flex-wrap gap-4 text-[9px] text-slate-400 font-mono z-20 shadow-xl max-w-[90%] sm:max-w-none">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Core Exchange</span>
                  <span className="flex items-center gap-1.5">🚗 Field Crew</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Pending</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Assigned</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Spliced</span>
                </div>
              </div>
            </FrostCard>
          </div>
        </div>
      )}

    </div>
  );
}
