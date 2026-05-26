"use client";

/**
 * Canadian biomanufacturing facilities — interactive Leaflet map.
 *
 * • Dots are CircleMarkers (not the default pin), coloured by build
 *   status (already built vs being built vs unknown). Radius scales
 *   with zoom level so dots stay legible when zoomed out (smaller +
 *   compact) and expand to readable size when the user zooms in.
 * • Click any dot → a Leaflet popup with the full facility record
 *   (name, status, address, specialisation, scale, notes, URL).
 * • Optional "Rescan" button in the popup, shown only to staff —
 *   posts to /api/admin/facilities/[id]/rescan which re-fetches the
 *   source URL via Jina Reader + asks the AI to refresh the
 *   `description` / `specialization` fields.
 *
 * Leaflet has to load client-side only (it touches `window` on
 * import), so the component itself is "use client" AND its parent
 * page imports it without lazy-loading. We rely on `react-leaflet`
 * which is well-behaved when client-rendered.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Factory, ExternalLink, MapPin, RefreshCcw, X, Filter } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface FacilityRow {
  id: string;
  name: string;
  url: string | null;
  status: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  specialization: string | null;
  scale: string | null;
  notes: string | null;
  description: string | null;
  lat: number;
  lng: number;
  lastScannedAt: string | null;
  scanError: string | null;
}

interface Props {
  initialFacilities: FacilityRow[];
  canRescan: boolean;
}

/** Status → colour map. Sticks to four hues max (brand-aware, not
 *  theme-specific) so the legend stays legible. */
function statusAccent(status: string | null): string {
  switch ((status ?? "").toLowerCase()) {
    case "already built": return "#0d9488"; // teal-600 — operational
    case "being built":   return "#d97706"; // amber-600 — under construction
    default:              return "#6b7280"; // gray-500  — unknown / informational
  }
}

export function FacilitiesMap({ initialFacilities, canRescan }: Props) {
  const [facilities, setFacilities] = useState<FacilityRow[]>(initialFacilities);
  const [selected, setSelected] = useState<FacilityRow | null>(null);
  const [provinceFilter, setProvinceFilter] = useState<string | null>(null);

  // Dynamic import of react-leaflet — it pulls in `leaflet` which
  // calls `window` at import time. Stored in state so the map only
  // renders after the client has hydrated.
  const [Lib, setLib] = useState<typeof import("react-leaflet") | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("react-leaflet");
      if (!cancelled) setLib(mod);
    })();
    return () => { cancelled = true; };
  }, []);

  // Provinces available, sorted alphabetically with an "All" option.
  const provinces = useMemo(() => {
    const set = new Set<string>();
    for (const f of facilities) {
      if (f.province) set.add(f.province);
    }
    return Array.from(set).sort();
  }, [facilities]);

  const visible = useMemo(() => {
    if (!provinceFilter) return facilities;
    return facilities.filter((f) => f.province === provinceFilter);
  }, [facilities, provinceFilter]);

  // Stat counts for the legend.
  const counts = useMemo(() => {
    const c = { built: 0, building: 0, unknown: 0 };
    for (const f of visible) {
      const s = (f.status ?? "").toLowerCase();
      if (s === "already built") c.built++;
      else if (s === "being built") c.building++;
      else c.unknown++;
    }
    return c;
  }, [visible]);

  return (
    <div className="space-y-3">
      {/* Filter / legend bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line/70 bg-card-solid px-4 py-2.5">
        <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
          <Filter size={11} /> Province
        </div>
        <button
          type="button"
          onClick={() => setProvinceFilter(null)}
          className={
            "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
            (provinceFilter === null
              ? "bg-brand-600 text-white font-semibold"
              : "text-fg-muted hover:text-fg hover:bg-elevated")
          }
        >
          All ({facilities.length})
        </button>
        {provinces.map((p) => {
          const n = facilities.filter((f) => f.province === p).length;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setProvinceFilter(p)}
              className={
                "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
                (provinceFilter === p
                  ? "bg-brand-600 text-white font-semibold"
                  : "text-fg-muted hover:text-fg hover:bg-elevated")
              }
            >
              {p} ({n})
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Status legend */}
        <div className="inline-flex items-center gap-3 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#0d9488" }} />
            Already built ({counts.built})
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#d97706" }} />
            Being built ({counts.building})
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#6b7280" }} />
            Other ({counts.unknown})
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-xl border border-line/70 overflow-hidden" style={{ height: "min(72vh, 720px)" }}>
        {Lib ? (
          <MapInner
            Lib={Lib}
            facilities={visible}
            onSelect={setSelected}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-fg-subtle text-[12.5px]">
            Loading map…
          </div>
        )}
      </div>

      {/* Selected-facility detail panel (renders below the map for
          accessibility / mobile). The map's own Leaflet popup is the
          primary surface; this panel is a stable fallback that
          persists after popup dismiss. */}
      {selected && (
        <FacilityDetailPanel
          facility={selected}
          onClose={() => setSelected(null)}
          canRescan={canRescan}
          onRescanned={(updated) => {
            setFacilities((cur) => cur.map((f) => f.id === updated.id ? updated : f));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Inner map — only renders once react-leaflet is loaded.
// ──────────────────────────────────────────────────────────────────

function MapInner({
  Lib, facilities, onSelect,
}: {
  Lib: typeof import("react-leaflet");
  facilities: FacilityRow[];
  onSelect: (f: FacilityRow | null) => void;
}) {
  const { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } = Lib;
  // Track zoom so we can scale marker radius. Higher zoom = more
  // detail = larger markers; lower zoom = compact dots.
  const [zoom, setZoom] = useState(5);

  function ZoomTracker() {
    useMapEvents({
      zoomend: (e) => setZoom(e.target.getZoom()),
    });
    return null;
  }

  // Default view — Canada-wide.
  const center: [number, number] = [55.0, -97.0];

  return (
    <MapContainer
      center={center}
      zoom={4}
      minZoom={3}
      maxZoom={14}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomTracker />
      {facilities.map((f) => {
        const accent = statusAccent(f.status);
        // Radius scales with zoom — 5 at zoom 4, up to 11 at zoom 12.
        const radius = Math.max(5, Math.min(11, 4 + (zoom - 3)));
        return (
          <CircleMarker
            key={f.id}
            center={[f.lat, f.lng]}
            radius={radius}
            pathOptions={{
              color: "white",
              weight: 1.5,
              fillColor: accent,
              fillOpacity: 0.85,
            }}
            eventHandlers={{
              click: () => onSelect(f),
            }}
          >
            <Popup>
              <FacilityPopupContent facility={f} accent={accent} />
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

// ──────────────────────────────────────────────────────────────────
// Popup content — what shows up inside the Leaflet popup.
// ──────────────────────────────────────────────────────────────────

function FacilityPopupContent({
  facility, accent,
}: {
  facility: FacilityRow;
  accent: string;
}) {
  return (
    <div className="space-y-1.5" style={{ minWidth: 220, maxWidth: 280 }}>
      <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold inline-flex items-center gap-1.5" style={{ color: accent }}>
        <Factory size={10} />
        {facility.status ?? "Facility"}
      </p>
      <p className="text-[14px] font-semibold text-fg leading-tight m-0">
        {facility.name}
      </p>
      {(facility.city || facility.province) && (
        <p className="text-[11.5px] text-fg-muted m-0">
          {[facility.city, facility.province].filter(Boolean).join(", ")}
        </p>
      )}
      {facility.specialization && (
        <p className="text-[11.5px] text-fg-muted leading-snug m-0">
          {facility.specialization}
        </p>
      )}
      {facility.url && (
        <a
          href={facility.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-700 hover:underline"
        >
          Visit site <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Detail panel — the stable below-map surface (so users don't lose
// the info the moment they click elsewhere or dismiss the popup).
// ──────────────────────────────────────────────────────────────────

function FacilityDetailPanel({
  facility, onClose, canRescan, onRescanned,
}: {
  facility: FacilityRow;
  onClose: () => void;
  canRescan: boolean;
  onRescanned: (f: FacilityRow) => void;
}) {
  const [rescanning, setRescanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accent = statusAccent(facility.status);

  async function rescan() {
    setRescanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/facilities/${facility.id}/rescan`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; facility?: FacilityRow; error?: string };
      if (!res.ok || !j.facility) {
        setError(j.error ?? `Rescan failed (HTTP ${res.status}).`);
        return;
      }
      onRescanned(j.facility);
    } finally {
      setRescanning(false);
    }
  }

  return (
    <article
      className="relative rounded-xl border bg-card-solid p-4"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 35%, var(--line))`,
        boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 18%, transparent), var(--shadow-card-rest)`,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md text-fg-subtle hover:text-fg hover:bg-elevated"
      >
        <X size={14} />
      </button>

      <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold inline-flex items-center gap-1.5" style={{ color: accent }}>
        <Building2 size={11} />
        {facility.status ?? "Facility"}
      </p>
      <h3 className="mt-1 text-[18px] font-semibold text-fg leading-tight pr-8">
        {facility.name}
      </h3>

      {(facility.city || facility.province) && (
        <p className="mt-1 text-[12px] text-fg-muted inline-flex items-center gap-1">
          <MapPin size={11} className="opacity-70" />
          {[facility.address, facility.city, facility.province].filter(Boolean).join(", ")}
        </p>
      )}

      {/* Specialisation + scale + notes — only render if present */}
      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-[12px] leading-relaxed">
        {facility.specialization && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-0.5">Specialisation</p>
            <p className="text-fg-muted">{facility.specialization}</p>
          </div>
        )}
        {facility.scale && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-0.5">Scale</p>
            <p className="text-fg-muted">{facility.scale}</p>
          </div>
        )}
        {facility.notes && (
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-0.5">Notes</p>
            <p className="text-fg-muted">{facility.notes}</p>
          </div>
        )}
        {facility.description && (
          <div className="sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-fg-subtle mb-0.5">
              Description{facility.lastScannedAt && (
                <span className="font-normal italic text-fg-subtle"> · refreshed {new Date(facility.lastScannedAt).toLocaleDateString()}</span>
              )}
            </p>
            <p className="text-fg-muted whitespace-pre-wrap">{facility.description}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/60 pt-3">
        {facility.url && (
          <a
            href={facility.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:underline"
          >
            Visit site <ExternalLink size={11} />
          </a>
        )}
        {canRescan && facility.url && (
          <button
            type="button"
            onClick={rescan}
            disabled={rescanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-semibold ring-1 ring-inset ring-line hover:bg-elevated disabled:opacity-50"
          >
            <RefreshCcw size={11} className={rescanning ? "animate-spin" : ""} />
            {rescanning ? "Rescanning…" : "Rescan facility"}
          </button>
        )}
        {error && (
          <p className="text-[11px] text-rose-700 leading-snug">{error}</p>
        )}
        {facility.scanError && !error && (
          <p className="text-[11px] text-rose-700/80 italic leading-snug">
            Last scan: {facility.scanError}
          </p>
        )}
      </div>
    </article>
  );
}
