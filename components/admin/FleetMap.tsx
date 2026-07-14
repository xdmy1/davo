"use client";

import { useEffect, useRef } from "react";
import type * as L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapVehicle = {
  id: number;
  name: string;
  lat: number | null;
  lon: number | null;
  status: "moving" | "idle" | "stopped" | "offline";
  speed: number;
  course: number | null;
};

const STATUS_COLOR: Record<MapVehicle["status"], string> = {
  moving: "#10b981",
  idle: "#f59e0b",
  stopped: "#3b82f6",
  offline: "#94a3b8",
};

// Marker HTML: pastilă colorată cu numărul; săgeată de direcție când e în mișcare.
function markerHtml(v: MapVehicle, selected: boolean): string {
  const color = STATUS_COLOR[v.status];
  const arrow =
    v.status === "moving" && v.course !== null
      ? `<div style="position:absolute;top:-9px;left:50%;transform:translateX(-50%) rotate(${v.course}deg);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${color};"></div>`
      : "";
  const ring = selected ? "box-shadow:0 0 0 3px rgba(249,115,22,.9),0 2px 6px rgba(0,0,0,.35);" : "box-shadow:0 2px 6px rgba(0,0,0,.35);";
  return `<div style="position:relative;transform:translateY(-50%);">
    ${arrow}
    <div style="display:flex;align-items:center;gap:4px;background:${color};color:#fff;font:600 11px/1 system-ui;padding:4px 7px;border-radius:999px;white-space:nowrap;border:2px solid #fff;${ring}">
      ${v.status === "moving" ? `<span>${v.speed}</span>` : ""}${escapeHtml(v.name)}
    </div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export default function FleetMap({
  vehicles,
  selectedId,
  onSelect,
}: {
  vehicles: MapVehicle[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const LRef = useRef<typeof L | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const didFitRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Init map (client only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const leaflet = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      LRef.current = leaflet;
      const map = leaflet.map(containerRef.current, {
        center: [47.0, 28.86], // Chișinău
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
      });
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        })
        .addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
      renderMarkers();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      didFitRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers when data / selection change.
  useEffect(() => {
    renderMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, selectedId]);

  // Fly to selected vehicle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selectedId === null) return;
    const v = vehicles.find((x) => x.id === selectedId);
    if (v && v.lat !== null && v.lon !== null) {
      map.flyTo([v.lat, v.lon], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function renderMarkers() {
    const leaflet = LRef.current;
    const map = mapRef.current;
    if (!leaflet || !map) return;

    const located = vehicles.filter((v) => v.lat !== null && v.lon !== null);
    const seen = new Set<number>();

    for (const v of located) {
      seen.add(v.id);
      const selected = v.id === selectedId;
      const icon = leaflet.divIcon({
        html: markerHtml(v, selected),
        className: "fleet-marker",
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const existing = markersRef.current.get(v.id);
      if (existing) {
        existing.setLatLng([v.lat!, v.lon!]);
        existing.setIcon(icon);
        existing.setZIndexOffset(selected ? 1000 : 0);
      } else {
        const m = leaflet
          .marker([v.lat!, v.lon!], { icon, zIndexOffset: selected ? 1000 : 0 })
          .addTo(map);
        m.on("click", () => onSelectRef.current(v.id));
        markersRef.current.set(v.id, m);
      }
    }

    // Remove markers for vehicles that disappeared.
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }

    // Fit bounds once, when we first have located vehicles.
    if (!didFitRef.current && located.length > 0) {
      const bounds = leaflet.latLngBounds(located.map((v) => [v.lat!, v.lon!] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      didFitRef.current = true;
    }
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
