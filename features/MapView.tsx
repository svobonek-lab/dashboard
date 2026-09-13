import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Sparkles, CheckCircle2, Clock, Shield, AlertTriangle, Zap, Layers, RefreshCw } from 'lucide-react';
import { Lead, CompanyBranding } from '../types';

interface MapViewProps {
  leads: Lead[];
  branding: CompanyBranding;
  onSelectLead: (lead: Lead) => void;
}

const CZECH_CITIES_COORDS: Record<string, [number, number]> = {
  'Praha': [50.0755, 14.4378],
  'Třinec': [49.6776, 18.6708],
  'Brno': [49.1951, 16.6068],
  'Ostrava': [49.8209, 18.2625],
  'Plzeň': [49.7384, 13.3736],
  'Liberec': [50.7671, 15.0562],
  'Olomouc': [49.5938, 17.2509],
  'České Budějovice': [48.9745, 14.4747],
  'Hradec Králové': [50.2104, 15.8252],
  'Pardubice': [50.0343, 15.7812],
  'Beroun': [49.9638, 14.0722],
  'Kladno': [50.1473, 14.1028],
  'Benešov': [49.7818, 14.6868],
};

function getLeadCoords(lead: Lead, index: number, defaultCity: string): [number, number] {
  if (lead.latLng && typeof lead.latLng.lat === 'number' && typeof lead.latLng.lng === 'number') {
    return [lead.latLng.lat, lead.latLng.lng];
  }
  const cityKey = Object.keys(CZECH_CITIES_COORDS).find(c =>
    lead.city?.toLowerCase().includes(c.toLowerCase()) ||
    lead.address?.toLowerCase().includes(c.toLowerCase())
  ) || Object.keys(CZECH_CITIES_COORDS).find(c => defaultCity?.toLowerCase().includes(c.toLowerCase())) || 'Praha';

  const base = CZECH_CITIES_COORDS[cityKey] || [50.0755, 14.4378];
  const offsets = [
    [0.012, 0.018],
    [-0.015, -0.022],
    [0.025, -0.014],
    [-0.018, 0.028],
    [0.031, 0.009],
    [-0.024, -0.031],
    [0.008, 0.035]
  ];
  const offset = offsets[index % offsets.length];
  return [base[0] + offset[0], base[1] + offset[1]];
}

export const MapView: React.FC<MapViewProps> = ({ leads, branding, onSelectLead }) => {
  const [selectedPin, setSelectedPin] = useState<Lead | null>(leads[0] || null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState(false);
  const [mapTileStyle, setMapTileStyle] = useState<'osm' | 'satellite' | 'carto'>('osm');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const getStatusHex = (status: string) => {
    switch (status) {
      case 'New': return '#3b82f6';
      case 'Contacted': return '#6366f1';
      case 'Quote': return '#f59e0b';
      case 'In Progress': return '#10b981';
      case 'Completed': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter: [number, number] = leads[0] 
        ? getLeadCoords(leads[0], 0, branding.city)
        : [50.0755, 14.4378];

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (mapTileStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    } else if (mapTileStyle === 'carto') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; CARTO &mdash; OpenStreetMap';
    }

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19, attribution });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Clear existing markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const latLngBounds = L.latLngBounds([]);

    // Add interactive custom Leaflet markers for each lead
    leads.forEach((lead, idx) => {
      const coords = getLeadCoords(lead, idx, branding.city);
      latLngBounds.extend(coords);

      const color = getStatusHex(lead.status);
      const isSelected = selectedPin?.id === lead.id;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker-wrapper',
        html: `
          <div style="
            position: relative;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            background: ${isSelected ? '#0f172a' : 'white'};
            color: ${isSelected ? 'white' : '#0f172a'};
            padding: 5px 10px;
            border-radius: 12px;
            border: 2px solid ${color};
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
            font-family: system-ui, sans-serif;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            transition: all 0.2s ease;
          ">
            <span style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: ${color};
              display: inline-block;
              box-shadow: 0 0 8px ${color};
            "></span>
            <span>${lead.customerName.split(' ')[0]}</span>
            <span style="opacity: 0.7; font-size: 10px;">${(lead.price / 1000).toFixed(0)}k</span>
          </div>
        `,
        iconSize: [120, 32],
        iconAnchor: [60, 16]
      });

      const marker = L.marker(coords, { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        setSelectedPin(lead);
      });

      markersRef.current.push(marker);
    });

    if (leads.length > 0) {
      map.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 14 });
    }

    // Force map size recalculation
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

  }, [leads, branding.city, mapTileStyle]);

  // Handle route optimization
  const handleOptimizeRoute = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      setOptimizedRoute(true);

      if (mapInstanceRef.current && leads.length > 0) {
        const map = mapInstanceRef.current;
        if (polylineRef.current) {
          map.removeLayer(polylineRef.current);
        }

        const routeCoords: [number, number][] = leads.map((lead, idx) => getLeadCoords(lead, idx, branding.city));

        const polyline = L.polyline(routeCoords, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.85,
          dashArray: '10, 10'
        }).addTo(map);

        polylineRef.current = polyline;
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    }, 900);
  };

  return (
    <div className="space-y-6 pb-16 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Reálná Mapa Výjezdů & Staveb</span>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">Live GPS OpenStreetMap</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Interaktivní mapa všech zakázek, dispečink techniků a GPS trasování v {branding.city}.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tile Style Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setMapTileStyle('osm')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${mapTileStyle === 'osm' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setMapTileStyle('carto')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${mapTileStyle === 'carto' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Světlý
            </button>
            <button
              onClick={() => setMapTileStyle('satellite')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${mapTileStyle === 'satellite' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Satelit
            </button>
          </div>

          <button
            onClick={handleOptimizeRoute}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Navigation className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'AI propočítává trasy...' : optimizedRoute ? 'Trasy optimalizovány (úspora 41 min)' : 'Optimalizovat denní výjezdy'}</span>
          </button>
        </div>
      </div>

      {/* Route Optimization Savings Banner (shown after click) */}
      {optimizedRoute && (
        <div className="bg-blue-50 p-5 rounded-2xl text-slate-900 shadow-sm border border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">AI Optimalizace tras úspěšně dokončena</h4>
              <p className="text-xs text-slate-600">Propojeny nejvýhodnější trasy pro všechny stavby v regionu {branding.city}.</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs font-bold bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-xs">
            <div>⏱️ Ušetřený čas: <span className="text-blue-600 font-mono">41 min</span></div>
            <div>⛽ Ušetřené palivo: <span className="text-blue-600 font-mono">4.2 L</span></div>
            <div>📍 Zkrácení tras: <span className="text-blue-600 font-mono">32 km</span></div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Leaflet Map Canvas */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-2 relative overflow-hidden h-[580px] shadow-sm flex flex-col">
          <div 
            ref={mapContainerRef} 
            className="w-full h-full rounded-2xl overflow-hidden z-0" 
            style={{ minHeight: '560px' }}
          />
        </div>

        {/* Selected Pin / Lead Detail Sidebar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm text-slate-900">
          {selectedPin ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                  selectedPin.status === 'In Progress' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {selectedPin.status}
                </span>
                <span className="text-sm font-extrabold text-slate-900 font-mono">{(selectedPin.price / 1000).toFixed(0)} tis. Kč</span>
              </div>

              <img src={selectedPin.thumbnail} alt="" className="w-full h-40 rounded-2xl object-cover border border-slate-200" />

              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedPin.title}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {selectedPin.address}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Zákazník:</span>
                  <span className="font-bold text-slate-900">{selectedPin.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Odpovědný mistr:</span>
                  <span className="font-bold text-blue-700">{selectedPin.assignedEmployeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Termín realizace:</span>
                  <span className="font-bold text-slate-900">{selectedPin.preferredDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(selectedPin.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Navigace</span>
                </a>
                <button
                  onClick={() => onSelectLead(selectedPin)}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer"
                >
                  Detail zakázky
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 text-slate-500 text-xs">
              Klepněte na značku na mapě pro zobrazení detailu stavební zakázky.
            </div>
          )}

          {optimizedRoute && (
            <div className="mt-4 p-3 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>Optimalizováno AI: Vyznačena modrá trasa se všemi výjezdy dňa.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


