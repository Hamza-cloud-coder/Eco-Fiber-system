'use client';
import React, { useState, useEffect } from 'react';
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

// Deterministically geocodes projects to draw spans on map
const hashProjectToLatLng = (id: string, name: string) => {
  let hash = 0;
  const str = id + name;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const baseLng = 39.2650;
  const baseLat = -6.7900;
  
  const lngOffset = ((Math.abs(hash) % 80) / 1000) * 0.12;
  const latOffset = (((Math.abs(hash) >> 2) % 80) / 1000) * 0.12;
  
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

export default function ProjectsView({ activeTab, setActiveTab }: ViewProps) {
  const { currentUser, projects, daily_construction_reports, insertTable, updateTable, connections } = useEcoOps();

  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjClass, setNewProjClass] = useState('FTTH Splitter Feeder Expansion');
  const [newProjTeam, setNewProjTeam] = useState('Team Kimara Sky');
  const [logProjId, setLogProjId] = useState('');
  const [logCables, setLogCables] = useState('500');
  const [logSplices, setLogSplices] = useState('10');
  const [logPoles, setLogPoles] = useState('4');
  const [logNotes, setLogNotes] = useState('');
  const [uploadedBlueprints, setUploadedBlueprints] = useState<string[]>([]);

  const handleDeployProject = () => {
    if (!newProjTitle.trim() || !newProjTeam.trim()) return;
    const isRing = newProjClass.includes('Ring');
    insertTable('projects', {
      name: newProjTitle.trim(),
      type: isRing ? 'Ring' : 'FTTH',
      team: newProjTeam.trim(),
      planned_meters: isRing ? 8000 : 2000,
      status: 'active',
    });
    setNewProjTitle('');
  };

  const handleLogEngineeringReport = () => {
    if (!logProjId) return;
    const proj = projects.find(p => p.id === logProjId) || {} as any;
    const cablesVal = parseInt(logCables) || 0;
    const splicesVal = parseInt(logSplices) || 0;
    const polesVal = parseInt(logPoles) || 0;
    insertTable('daily_construction_reports', {
      project_name: proj.name,
      project_type: proj.type,
      segment_name: `${proj.name} Segment Log`,
      meters_laid: cablesVal,
      fibers_spliced: splicesVal,
      reported_by: currentUser?.id || 'pm-1',
      supervisor_verified: false,
      details: { c48: cablesVal.toString(), s96: splicesVal.toString(), accAdss: '10', accBuckle: '20', poleConc: polesVal.toString() },
      notes: logNotes || 'Standard route construction progress.'
    });
    setLogNotes('');
  };

  const handleSeedCAD = () => {
    setUploadedBlueprints(prev => [...prev, 'metro_core_shamo_overlay.kml', 'central_cbd_ring_span.dwg']);
  };

  return (
    <div className="space-y-6">

      {/* TAB 1: MANAGE PROJECTS */}
      {activeTab === 'Manage Projects' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

          <FrostCard className="md:col-span-1 lg:col-span-2 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Construct New Project Layout</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Project Layout Title</label>
                <input
                  type="text"
                  placeholder="e.g. Mikocheni B Expansion"
                  value={newProjTitle}
                  onChange={e => setNewProjTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Terminal Layout Class</label>
                <select
                  value={newProjClass}
                  onChange={e => setNewProjClass(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="FTTH Splitter Feeder Expansion">FTTH Splitter Feeder Expansion</option>
                  <option value="High-Capacity Ring Backbone">High-Capacity Ring Backbone</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Allocated Contractor Team</label>
                <input
                  type="text"
                  placeholder="e.g. Team Regent Estates"
                  value={newProjTeam}
                  onChange={e => setNewProjTeam(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>
            <button
              onClick={handleDeployProject}
              className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors mt-6"
            >
              Deploy Project Blueprint
            </button>
          </FrostCard>

          <FrostCard className="md:col-span-2 lg:col-span-3 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Active Infrastructure Overlay</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {projects.map((proj: any) => {
                const reports = daily_construction_reports.filter(r => r.project_name === proj.name);
                const verifiedLaid = reports.filter(r => r.supervisor_verified).reduce((acc, curr) => acc + curr.meters_laid, 0);
                const isActive = proj.status === 'active';
                return (
                  <div key={proj.id} className="p-5 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{proj.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Team: {proj.team} · {proj.type}</p>
                      </div>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isActive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'}`}>
                        {proj.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Cables Installed</span>
                        <span className="text-white font-mono mt-0.5 block">{verifiedLaid}m / {proj.planned_meters}m</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wide">Segment Logs</span>
                        <span className="text-white font-mono mt-0.5 block">{reports.length} segments</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">No projects deployed yet.</p>
              )}
            </div>
          </FrostCard>

        </div>
      )}

      {/* TAB 2: DAILY FIELD LOGS */}
      {activeTab === 'Daily Field Logs' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

          <FrostCard className="md:col-span-1 lg:col-span-2 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Submit Daily Construction Log</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Target Construction Project</label>
                <select
                  value={logProjId}
                  onChange={e => setLogProjId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Cables Laid (meters)</label>
                <input
                  type="number"
                  value={logCables}
                  onChange={e => setLogCables(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Splicers Done</label>
                  <input
                    type="number"
                    value={logSplices}
                    onChange={e => setLogSplices(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Poles Erected</label>
                  <input
                    type="number"
                    value={logPoles}
                    onChange={e => setLogPoles(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Description</label>
                <textarea
                  rows={4}
                  placeholder="Summarize engineering construction activities..."
                  value={logNotes}
                  onChange={e => setLogNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors resize-none placeholder:text-slate-600"
                />
              </div>
            </div>
            <button
              onClick={handleLogEngineeringReport}
              className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors mt-6"
            >
              Log Engineering Report
            </button>
          </FrostCard>

          <FrostCard className="md:col-span-2 lg:col-span-3 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Construction Activity Stream</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {daily_construction_reports.map((r: any) => (
                <div key={r.id} className="p-4 bg-white/3 border border-white/5 rounded-2xl hover:bg-white/5 transition-all">
                  <div className="flex justify-between items-start text-xs mb-2">
                    <span className="text-slate-500 font-mono">{r.created_at ? r.created_at.split('T')[0] : '2026-05-20'}</span>
                    <span className="text-indigo-400 font-medium text-[10px] uppercase">{r.project_name}</span>
                  </div>
                  <p className="text-xs text-slate-300 italic mb-3">"{r.notes}"</p>
                  <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 pt-2 border-t border-white/5">
                    <span>Cables: <span className="text-white font-mono">{r.meters_laid}m</span></span>
                    <span>Spliced: <span className="text-white font-mono">{r.fibers_spliced} cores</span></span>
                    <span>Poles: <span className="text-white font-mono">{r.details?.poleConc || 0}</span></span>
                    <span className="ml-auto text-slate-600">By Devota John</span>
                  </div>
                </div>
              ))}
              {daily_construction_reports.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-6">No construction reports logged.</p>
              )}
            </div>
          </FrostCard>

        </div>
      )}

      {/* TAB 3: PROJECT BLUEPRINTS */}
      {activeTab === 'Project Blueprints' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">

          <FrostCard className="md:col-span-1 lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white">CAD Blueprints Center</h3>
              <button
                onClick={handleSeedCAD}
                className="text-[10px] bg-white/10 hover:bg-white/15 text-white border border-white/10 font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                Seed CAD
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">Upload architectural CAD or GIS route overlays to process network spans</p>
            <div className="border border-dashed border-white/10 bg-white/3 hover:bg-white/5 rounded-2xl p-8 flex flex-col justify-center items-center text-center cursor-pointer transition-all min-h-[140px] mb-4">
              <p className="text-xs font-medium text-slate-300 mb-1">Drag or click to upload</p>
              <p className="text-[10px] text-slate-500">DWG, DXF, KML, KMZ</p>
            </div>
            {uploadedBlueprints.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Processed Files</p>
                {uploadedBlueprints.map((item, idx) => (
                  <div key={idx} className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex justify-between items-center text-[10px]">
                    <span className="text-emerald-400 font-mono">{item}</span>
                    <span className="text-emerald-500 font-bold text-[9px] uppercase">Active</span>
                  </div>
                ))}
              </div>
            )}
          </FrostCard>

          <FrostCard className="md:col-span-2 lg:col-span-3 p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-1">Interactive Project GIS Canvas</h3>
            <p className="text-xs text-slate-500 mb-5">Visualizing active rollouts, backbone core nodes, and verified segment spans geographically.</p>
            <div className="w-full h-[320px] bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/5 relative flex-grow">
              <Map
                theme="dark"
                viewport={{
                  center: [39.2721, -6.7924],
                  zoom: 11.2,
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

                {/* Plot Backbone core nodes */}
                {backboneNodes.map(node => (
                  <MapMarker
                    key={`pm-bb-${node.id}`}
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

                {/* Plot active project rollouts dynamically */}
                {projects.map((proj: any) => {
                  const { longitude, latitude } = hashProjectToLatLng(proj.id, proj.name);
                  const reports = daily_construction_reports.filter(r => r.project_name === proj.name);
                  const laid = reports.filter(r => r.supervisor_verified).reduce((acc, curr) => acc + curr.meters_laid, 0);
                  const percent = Math.min(100, Math.round((laid / proj.planned_meters) * 100));
                  
                  return (
                    <MapMarker
                      key={`pm-proj-${proj.id}`}
                      longitude={longitude}
                      latitude={latitude}
                    >
                      <MarkerContent>
                        <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-400 flex items-center justify-center text-xs font-bold text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] hover:scale-115 transition-transform cursor-pointer">
                          🍃
                        </div>
                      </MarkerContent>
                      <MarkerPopup closeButton>
                        <div className="space-y-1.5 font-sans min-w-[170px] p-0.5 text-slate-800">
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest font-mono">{proj.type} Project</p>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">{proj.name}</h4>
                          <div className="text-[11px] text-slate-500">
                            Team: <span className="font-semibold text-slate-700">{proj.team}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Fiber laid: <span className="font-mono font-bold text-emerald-600">{laid.toLocaleString()}m / {proj.planned_meters.toLocaleString()}m</span>
                          </div>
                          
                          <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                            <div className="flex justify-between items-center text-[10px] mb-1">
                              <span className="text-slate-400">Laid Progress</span>
                              <span className="font-bold font-mono text-emerald-600">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      </MarkerPopup>
                    </MapMarker>
                  );
                })}
              </Map>

              {/* Custom floating map legend widget */}
              <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex gap-4 text-[9px] text-slate-400 font-mono z-20 shadow-xl">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Backbone Core</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Rollout Segment</span>
              </div>
            </div>
          </FrostCard>

        </div>
      )}

    </div>
  );
}
