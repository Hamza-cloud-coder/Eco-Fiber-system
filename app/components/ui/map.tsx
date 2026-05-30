'use client';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapContextType {
  map: maplibregl.Map | null;
  isLoaded: boolean;
}

const MapContext = createContext<MapContextType>({ map: null, isLoaded: false });

export const useMap = () => useContext(MapContext);

export function Map({ theme = 'dark', viewport, children }: any) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const styleUrl = theme === 'dark' 
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const newMap = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: viewport?.center || [0, 0],
      zoom: viewport?.zoom || 1,
      pitch: viewport?.pitch || 0,
      bearing: viewport?.bearing || 0,
      attributionControl: false,
    });

    newMap.on('load', () => {
      setIsLoaded(true);
    });

    setMap(newMap);

    return () => {
      newMap.remove();
    };
  }, []); // Run once on mount

  return (
    <MapContext.Provider value={{ map, isLoaded }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%', absolute: 'absolute', inset: 0 }} />
      {isLoaded && children}
    </MapContext.Provider>
  );
}

export function MapMarker({ longitude, latitude, children }: any) {
  const { map } = useMap();
  const elRef = useRef<HTMLDivElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map || !elRef.current) return;
    
    markerRef.current = new maplibregl.Marker({ element: elRef.current })
      .setLngLat([longitude, latitude])
      .addTo(map);
      
    // Fix popup toggling based on click inside generic wrapper
    const clickHandler = (e: MouseEvent) => {
      e.stopPropagation();
      setShowPopup(prev => !prev);
    };
    
    elRef.current.addEventListener('click', clickHandler);
    
    return () => {
      if (elRef.current) elRef.current.removeEventListener('click', clickHandler);
      markerRef.current?.remove();
    };
  }, [map, longitude, latitude]);

  return (
    <div ref={elRef} className="relative group flex flex-col items-center">
      {React.Children.map(children, child => {
        if (!React.isValidElement(child)) return child;
        if (child.type === MarkerPopup) {
          if (!showPopup) return null;
          return React.cloneElement(child as React.ReactElement<any>, { 
            onClose: () => setShowPopup(false)
          });
        }
        return child;
      })}
    </div>
  );
}

export function MarkerContent({ children }: any) {
  return <>{children}</>;
}

export function MarkerPopup({ children, closeButton, onClose }: any) {
  return (
    <div 
      className="absolute bottom-full mb-3 bg-white rounded-xl shadow-xl z-50 text-slate-900 border border-slate-200 cursor-default"
      onClick={e => e.stopPropagation()} // Prevent toggling the marker when clicking inside popup
    >
      {closeButton && (
        <button 
          onClick={(e) => { e.stopPropagation(); onClose?.(); }} 
          className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
        >
          ×
        </button>
      )}
      <div className="p-3">
        {children}
      </div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white" />
    </div>
  );
}

export function MarkerTooltip({ children }: any) {
  return (
    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-white/20 text-white px-2 py-1 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-black/80" />
    </div>
  );
}

export function MapControls({ showZoom, showCompass, showFullscreen }: any) {
  const { map } = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    if (showZoom || showCompass) {
      const navCtrl = new maplibregl.NavigationControl({
        showCompass,
        showZoom,
      });
      map.addControl(navCtrl, 'top-right');
    }
    
    if (showFullscreen) {
      const fsCtrl = new maplibregl.FullscreenControl({});
      map.addControl(fsCtrl, 'top-right');
    }
  }, [map, showZoom, showCompass, showFullscreen]);
  
  return null;
}
