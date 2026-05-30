'use client';
import React, { useState, useEffect } from 'react';
import { useEcoOps } from '../core/context';
import { FrostCard } from '../core/frostUi';
import { cn } from '../utils/cn';
import { Hexagon, Plus, Search, Bell, LogOut, Sparkles, X, Menu, Loader2 } from 'lucide-react';
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, MapControls, useMap } from '../components/ui/map';

interface ViewProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

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

export default function DispatchView({ activeTab, setActiveTab }: ViewProps) {
  const { users, connections, insertTable, updateTable, batchOp } = useEcoOps();

  const [clientName, setClientName] = useState('');
  const [terminalClass, setTerminalClass] = useState('FTTH Drop Wire (Primary)');
  const [phone, setPhone] = useState('');
  const [sector, setSector] = useState('Kijitonyama');

  const activeTechs = users.filter((u: any) => u.role === 'Technician' && u.status === 'Approved');

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

  const handleOnboardSubscriber = () => {
    if (!clientName.trim() || !phone.trim()) return;
    const seedNum = Math.floor(1000 + Math.random() * 8999);
    const isRing = terminalClass.includes('Ring');
    insertTable('connections', {
      account_number: `EES-${isRing ? 'RING' : 'FTTH'}-${seedNum}`,
      client_name: clientName.trim(),
      connection_type: isRing ? 'RING' : 'FTTH',
      location: sector,
      contact_phone: phone.trim(),
      ticket_status: 'Pending',
      payment_status: 'Unpaid'
    });
    setClientName('');
    setPhone('');
  };

  const handleAssignTechnician = (conn: any, techId: string) => {
    if (!techId) return;
    batchOp("Dispatching field technician to subscriber site...", [
      {
        type: 'update',
        table: 'connections',
        id: conn.id,
        data: { ticket_status: 'Assigned', assigned_tech_id: techId }
      },
      {
        type: 'insert',
        table: 'work_orders',
        data: {
          connection_id: conn.id,
          assigned_tech_id: techId,
          status: 'Assigned',
          checklist: [
            { text: 'Safety brief & PPE check', done: false },
            { text: 'ONT terminal mounts & fiber drops', done: false }
          ]
        }
      }
    ]);
  };

  return (
    <div className="space-y-6">

      {/* TAB 1: CLIENT ONBOARDING */}
      {activeTab === 'Client Onboarding' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          <FrostCard className="lg:col-span-2 p-6">
            <h3 className="text-lg font-bold text-white mb-6">Onboard Client Subscribers</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Subscriber Corporate Title</label>
                <input
                  type="text"
                  placeholder="e.g. Oysterbay Bank"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Subscriber Terminal Class</label>
                <select
                  value={terminalClass}
                  onChange={e => setTerminalClass(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="FTTH Drop Wire (Primary)">FTTH Drop Wire (Primary)</option>
                  <option value="FTTH Splitter Feeder Expansion">FTTH Splitter Feeder Expansion</option>
                  <option value="High-Capacity Ring Drop">High-Capacity Ring Drop</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Contact Number</label>
                <input
                  type="text"
                  placeholder="+255 7XX XXX XXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1.5">Service Sector</label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
                >
                  <option value="Kijitonyama">Kijitonyama</option>
                  <option value="Mbezi Beach">Mbezi Beach</option>
                  <option value="Upanga">Upanga</option>
                  <option value="Mikocheni">Mikocheni</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleOnboardSubscriber}
              className="w-full bg-white text-slate-900 hover:bg-slate-100 font-semibold py-2.5 rounded-xl text-xs transition-colors mt-6"
            >
              Onboard Subscriber
            </button>
          </FrostCard>

          <FrostCard className="lg:col-span-3 p-6">
            <h3 className="text-lg font-bold text-white mb-6">CRM Subscriber Registry</h3>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-3 text-slate-500 font-medium">Account No.</th>
                    <th className="pb-3 text-slate-500 font-medium">Subscriber</th>
                    <th className="pb-3 text-slate-500 font-medium">Zone</th>
                    <th className="pb-3 text-slate-500 font-medium">Phone</th>
                    <th className="pb-3 text-slate-500 font-medium text-right">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {connections.map((c: any) => (
                    <tr key={c.id} className="hover:bg-white/2">
                      <td className="py-3 text-slate-500 font-mono">{c.account_number || 'EES-FTTH-8091'}</td>
                      <td className="py-3 text-white font-medium">{c.client_name}</td>
                      <td className="py-3 text-slate-400">{c.location}</td>
                      <td className="py-3 text-slate-400 font-mono">{c.contact_phone || '+255 784 553 112'}</td>
                      <td className="py-3 text-right">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${c.connection_type === 'RING' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'}`}>
                          {c.connection_type}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {connections.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-500">No subscribers registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </FrostCard>

        </div>
      )}

      {/* TAB 2: DISPATCH QUEUE */}
      {activeTab === 'Dispatch Queue' && (
        <FrostCard className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white">Fulfillment Operations Dispatch Board</h3>
            <p className="text-xs text-slate-500 mt-1">Assign approved installers and dispatch fiber terminals across Dar es Salaam</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 text-slate-500 font-medium">Account No.</th>
                  <th className="pb-3 text-slate-500 font-medium">Subscriber</th>
                  <th className="pb-3 text-slate-500 font-medium">Sector</th>
                  <th className="pb-3 text-slate-500 font-medium">Status</th>
                  <th className="pb-3 text-slate-500 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {connections.map((c: any) => {
                  const isUnassigned = c.ticket_status === 'Pending';
                  const isAssigned = c.ticket_status === 'Assigned';
                  const isCompleted = c.ticket_status === 'Completed';
                  const tech = activeTechs.find(t => t.id === c.assigned_tech_id);
                  const statusColor = isCompleted
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : isAssigned
                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                    : 'text-slate-400 bg-white/5 border-white/10';
                  return (
                    <tr key={c.id} className="hover:bg-white/2">
                      <td className="py-3.5 text-slate-500 font-mono">{c.account_number || 'EES-FTTH-8091'}</td>
                      <td className="py-3.5 text-white font-medium">{c.client_name}</td>
                      <td className="py-3.5 text-slate-400">{c.location}</td>
                      <td className="py-3.5">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                          {isUnassigned ? 'Unassigned' : c.ticket_status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {isUnassigned ? (
                          <div className="flex gap-2 justify-end">
                            <select
                              id={`tech_sel_${c.id}`}
                              className="bg-white/5 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500/50 transition-colors"
                            >
                              <option value="">Select Tech</option>
                              {activeTechs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button
                              onClick={() => {
                                const sel = document.getElementById(`tech_sel_${c.id}`) as HTMLSelectElement;
                                if (sel?.value) handleAssignTechnician(c, sel.value);
                              }}
                              className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-3 py-1.5 rounded-lg text-[10px] transition-colors"
                            >
                              Assign
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            {isCompleted ? 'Completed' : `→ ${tech?.name || 'Assigned'}`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {connections.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-500">No connections found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </FrostCard>
      )}

      {/* TAB 3: CAD FILE CENTER */}
      {activeTab === 'CAD File Center' && (
        <div className="space-y-4">

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            <FrostCard className="lg:col-span-2 p-6">
              <h3 className="text-lg font-bold text-white mb-2">CAD Blueprints Center</h3>
              <p className="text-xs text-slate-500 mb-6">Upload architectural CAD or GIS route overlays to process network spans</p>
              <div className="border border-dashed border-white/10 bg-white/3 hover:bg-white/5 rounded-2xl p-8 flex flex-col justify-center items-center text-center cursor-pointer transition-all min-h-[160px]">
                <p className="text-xs font-medium text-slate-300 mb-1">Drag or click to upload blueprint files</p>
                <p className="text-[10px] text-slate-500">Accepts: DWG, DXF, KML, KMZ</p>
              </div>
            </FrostCard>

            <FrostCard className="lg:col-span-3 p-6">
              <h3 className="text-lg font-bold text-white mb-1">GIS Diagnostic Route Map</h3>
              <p className="text-xs text-slate-500 mb-5">Optical diagnostic split monitoring — power loss values calculated automatically</p>
              <div className="bg-[#0b0f19] rounded-2xl p-5 border border-white/5 relative overflow-hidden min-h-[160px] flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-b border-white/5 pb-2">
                  <span className="text-indigo-400">COMPLIANCE DIAGNOSTICS: METRO CORE</span>
                  <span>GIS: -6.7924° S, 39.2721° E</span>
                </div>
                <div className="flex justify-between items-center my-5 relative px-2">
                  <div className="absolute top-4 left-4 right-4 h-px border-t border-dashed border-white/10" />
                  {[
                    { label: 'TANESCO Terminal', active: true },
                    { label: 'Shamo Tower', active: true },
                    { label: 'Kijitonyama', active: false },
                    { label: 'Mbezi Junction', active: false }
                  ].map(node => (
                    <div key={node.label} className="flex flex-col items-center z-10">
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold ${node.active ? 'bg-indigo-950 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-slate-600'}`}>
                        ⚡
                      </div>
                      <span className="text-[8px] mt-2 font-medium text-slate-500 text-center max-w-[60px] leading-tight">{node.label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[8px] font-medium text-slate-600 border-t border-white/5 pt-2 flex justify-between">
                  <span>Logs db readings upon completion</span>
                  <span className="text-rose-500">Loss limit: {'<'} -25.0 dBm</span>
                </div>
              </div>
            </FrostCard>

          </div>

          <FrostCard className="p-6">
            <h3 className="text-lg font-bold text-white mb-2">Live Fiber Deployment Network Map</h3>
            <p className="text-xs text-slate-500 mb-5">Visual representation of fiber backbone ring loops and customer drop locations in Dar es Salaam</p>
            <div className="w-full h-[450px] bg-[#0b0f19] rounded-2xl overflow-hidden border border-white/5 relative">
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

                {/* Plot Backbone nodes as custom markers */}
                {backboneNodes.map(node => (
                  <MapMarker
                    key={node.id}
                    longitude={node.longitude}
                    latitude={node.latitude}
                  >
                    <MarkerContent>
                      <div className="relative group">
                        <div className="w-7 h-7 rounded-full bg-indigo-950/90 border-2 border-indigo-400 flex items-center justify-center text-xs font-bold text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:scale-110 transition-transform">
                          ⚡
                        </div>
                      </div>
                    </MarkerContent>
                    <MarkerTooltip>
                      <div className="text-xs font-bold font-mono">{node.label}</div>
                    </MarkerTooltip>
                  </MapMarker>
                ))}

                {/* Plot Customer subscriber connection nodes */}
                {connections.map((c: any) => {
                  const { longitude, latitude } = hashStringToLatLng(c.id, c.client_name, c.location);
                  const color = c.ticket_status === 'Completed' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : c.ticket_status === 'Assigned' ? 'bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-rose-500 border-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
                  
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
                        <div className="space-y-1.5 font-sans min-w-[150px] p-0.5">
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{c.account_number}</p>
                          <h4 className="text-sm font-bold text-slate-800 leading-tight">{c.client_name}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>Sector:</span>
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
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Pending</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Dispatched</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed</span>
              </div>
            </div>
          </FrostCard>

        </div>
      )}

    </div>
  );
}
