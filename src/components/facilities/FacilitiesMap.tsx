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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Factory, ExternalLink, MapPin, RefreshCcw, X, Filter, Navigation, Globe2 } from "lucide-react";
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

/** Pre-defined metro / regional shortcuts. Clicking a chip flies the
 *  map to that bounding box so users don't have to scroll-zoom in
 *  several times from the country-wide view. Bounds are deliberately
 *  loose — Leaflet's flyToBounds adds padding + caps zoom for tiny
 *  boxes so single-facility regions don't end up at street-level
 *  zoom. Order: roughly east-to-west by relevance.
 *
 *  New region? Add it here, pick a bounding box that contains the
 *  facilities you want grouped, give it a unique id. The "Jump to"
 *  row renders chips in the order below; counts are computed per
 *  region against the current visible-facilities set so empty
 *  regions auto-hide. */
interface MapRegion {
  id: string;
  label: string;
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}
const MAP_REGIONS: MapRegion[] = [
  { id: "atl", label: "Atlantic",          swLat: 44.50, swLng: -64.40, neLat: 46.40, neLng: -62.50 },
  { id: "qc",  label: "Québec City",       swLat: 46.65, swLng: -71.50, neLat: 46.95, neLng: -70.95 },
  { id: "mtl", label: "Greater Montréal",  swLat: 45.28, swLng: -73.95, neLat: 45.75, neLng: -72.85 },
  { id: "ott", label: "Ottawa",            swLat: 45.20, swLng: -76.50, neLat: 45.55, neLng: -75.40 },
  { id: "gta", label: "GTA & Hamilton",    swLat: 43.10, swLng: -80.35, neLat: 44.20, neLng: -78.80 },
  { id: "pra", label: "Prairies",          swLat: 49.50, swLng: -107.50, neLat: 52.50, neLng: -96.50 },
  { id: "yyc", label: "Calgary–Edmonton",  swLat: 50.85, swLng: -114.30, neLat: 53.70, neLng: -113.20 },
  { id: "yvr", label: "Vancouver Metro",   swLat: 49.10, swLng: -123.35, neLat: 49.40, neLng: -122.80 },
  { id: "yyj", label: "Victoria",          swLat: 48.35, swLng: -123.55, neLat: 48.55, neLng: -123.25 },
];

/** Friendlier labels for the 2-letter province codes used in the
 *  data. Codes (BC, NB, NL, NT) kept where the full name would be
 *  unwieldy on a chip. */
const PROVINCE_LABELS: Record<string, string> = {
  BC: "British Columbia",
  AB: "Alberta",
  SK: "Saskatchewan",
  MB: "Manitoba",
  ON: "Ontario",
  QC: "Québec",
  NB: "New Brunswick",
  NS: "Nova Scotia",
  PE: "PEI",
  NL: "Newfoundland",
  YT: "Yukon",
  NT: "NWT",
  NU: "Nunavut",
};

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
  const [activeRegion, setActiveRegion] = useState<string | null>(null);

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

  // Imperative handle to the Leaflet map instance. MapInner registers
  // it via the onMapReady callback once the inner MapContainer has
  // mounted; we use it from the "Jump to" chips to flyToBounds without
  // having to route through React state on every click.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const handleMapReady = (m: unknown) => { mapRef.current = m; };

  function jumpToRegion(region: MapRegion) {
    setActiveRegion(region.id);
    const map = mapRef.current;
    if (!map) return;
    // padding leaves a little air around the marker cluster so dots
    // near the bounds aren't pressed against the viewport edge.
    // maxZoom: 13 prevents single-facility regions (like Victoria,
    // which currently has one site) from zooming all the way in to
    // street-level — we want metro context, not a satellite snap.
    map.flyToBounds(
      [[region.swLat, region.swLng], [region.neLat, region.neLng]],
      { padding: [44, 44], duration: 0.8, maxZoom: 13 },
    );
  }

  function jumpToCanada() {
    setActiveRegion(null);
    setProvinceFilter(null);
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([55.0, -97.0], 4, { duration: 0.8 });
  }

  // Provinces available, sorted alphabetically with an "All" option.
  const provinces = useMemo(() => {
    const set = new Set<string>();
    for (const f of facilities) {
      if (f.province) set.add(f.province);
    }
    return Array.from(set).sort();
  }, [facilities]);

  // Per-province bounding box, computed from the actual facility
  // coords so flyToBounds frames the dots rather than empty
  // wilderness. We use the FULL facilities list (not `visible`) so
  // a province's bbox is stable as the filter changes — clicking
  // "Ontario" should always frame the same area regardless of what
  // was previously filtered.
  const provinceBounds = useMemo(() => {
    const m: Record<string, { swLat: number; swLng: number; neLat: number; neLng: number }> = {};
    for (const f of facilities) {
      if (!f.province) continue;
      const cur = m[f.province];
      if (!cur) {
        m[f.province] = { swLat: f.lat, swLng: f.lng, neLat: f.lat, neLng: f.lng };
      } else {
        cur.swLat = Math.min(cur.swLat, f.lat);
        cur.swLng = Math.min(cur.swLng, f.lng);
        cur.neLat = Math.max(cur.neLat, f.lat);
        cur.neLng = Math.max(cur.neLng, f.lng);
      }
    }
    return m;
  }, [facilities]);

  function jumpToProvince(province: string) {
    // Province click does double duty: filter the data to that
    // province AND fly the map there. Clearing the cluster active
    // state because a province is the broader category — keeping a
    // metro-cluster pill highlighted while flying out to province
    // scale would be misleading.
    setProvinceFilter(province);
    setActiveRegion(null);
    const b = provinceBounds[province];
    const map = mapRef.current;
    if (!b || !map) return;
    map.flyToBounds(
      [[b.swLat, b.swLng], [b.neLat, b.neLng]],
      { padding: [60, 60], duration: 0.8, maxZoom: 9 },
    );
  }

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

  // Per-region facility counts against the CURRENT visible set
  // (province filter respected). Regions with zero facilities are
  // suppressed in the chip row below.
  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of MAP_REGIONS) {
      counts[r.id] = visible.filter(
        (f) => f.lat >= r.swLat && f.lat <= r.neLat && f.lng >= r.swLng && f.lng <= r.neLng,
      ).length;
    }
    return counts;
  }, [visible]);

  // Cluster chips visible against the current province filter.
  // Computed up here so the JSX can know whether to render the
  // "Clusters" row at all (suppress the row entirely when every
  // cluster comes up empty for the current filter, instead of
  // showing a label with no chips).
  const visibleRegions = MAP_REGIONS.filter((r) => (regionCounts[r.id] ?? 0) > 0);

  return (
    <div className="space-y-3">
      {/* Unified navigation. Three rows in one card:
            1. Heading + Canada reset + status legend (right-aligned).
            2. Provinces — broad geographic targets. Clicking a
               province both narrows the facility list to that
               province AND flies the map to the province's bbox
               (filter + fly = one click instead of two).
            3. Metro clusters — finer-grained targets sitting under
               provinces, since clusters are sub-province regions
               (GTA in ON, Montréal in QC, etc.). Counts respect the
               active province filter; empty clusters auto-hide and
               the whole row disappears if all clusters are empty. */}
      <div className="rounded-xl border border-line/70 bg-card-solid px-4 py-3 space-y-2.5">
        {/* Row 1 — heading + Canada reset + legend */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-bold text-fg-subtle">
            <Navigation size={11} /> Jump to
          </div>
          <button
            type="button"
            onClick={jumpToCanada}
            className={
              "inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-md transition-colors " +
              (provinceFilter === null && activeRegion === null
                ? "bg-brand-600 text-white font-semibold"
                : "text-fg-muted hover:text-fg hover:bg-elevated")
            }
            title="Reset to Canada-wide view (clears province filter)"
          >
            <Globe2 size={11} /> Canada ({facilities.length})
          </button>

          <div className="flex-1" />

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

        {/* Row 2 — Provinces. Click filters + flies. */}
        <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5 border-t border-line/60 pt-2">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-fg-subtle w-[86px] pt-1 shrink-0">
            <Filter size={10} /> Provinces
          </div>
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {provinces.map((p) => {
              const n = facilities.filter((f) => f.province === p).length;
              const label = PROVINCE_LABELS[p] ?? p;
              const isActive = provinceFilter === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => jumpToProvince(p)}
                  className={
                    "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
                    (isActive
                      ? "bg-brand-600 text-white font-semibold"
                      : "text-fg-muted hover:text-fg hover:bg-elevated")
                  }
                  title={`Filter and fly to ${label}`}
                >
                  {label} ({n})
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3 — Metro clusters. Empty clusters auto-hide via
            regionCounts (which respects the active province filter),
            and the whole row hides when nothing's left to jump to. */}
        {visibleRegions.length > 0 && (
          <div className="flex flex-wrap items-start gap-x-2 gap-y-1.5 border-t border-line/60 pt-2">
            <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] font-semibold text-fg-subtle w-[86px] pt-1 shrink-0">
              <MapPin size={10} /> Clusters
            </div>
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {visibleRegions.map((r) => {
                const n = regionCounts[r.id] ?? 0;
                const isActive = activeRegion === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => jumpToRegion(r)}
                    className={
                      "text-[11.5px] px-2 py-1 rounded-md transition-colors " +
                      (isActive
                        ? "bg-brand-600 text-white font-semibold"
                        : "text-fg-muted hover:text-fg hover:bg-elevated")
                    }
                    title={`Zoom into ${r.label}`}
                  >
                    {r.label} ({n})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-xl border border-line/70 overflow-hidden" style={{ height: "min(72vh, 720px)" }}>
        {Lib ? (
          <MapInner
            Lib={Lib}
            facilities={visible}
            onSelect={setSelected}
            onMapReady={handleMapReady}
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

/** Group facilities into clusters of geographically near neighbours and
 *  compute a display position for each: singletons keep their true
 *  lat/lng, multi-member clusters get arranged on a small ring around
 *  the cluster centroid so they don't pile onto the same pixel.
 *
 *  Why per-cluster ring layout instead of a Leaflet.markercluster plugin?
 *  At Canada-zoom-out, the spread between sites in the same metro is
 *  already small but legible (e.g. AbCellera Yukon St vs Precision
 *  NanoSystems Vernon Dr — 4 km apart). What kills the map is
 *  shared-building cases: MaRS has 5+ tenant facilities at one
 *  postal address. Arranging them on a ring of ~80m radius around
 *  the building means at zoom 14+ they fan out into clickable
 *  individuals, while at low zoom the ring is sub-pixel and the
 *  group reads as a single denser dot. Cheap, no extra deps.
 *
 *  The ring radius is in degrees lat/lng, not metres — Leaflet plots
 *  CircleMarker at fixed coords, so we accept a small longitudinal
 *  distortion (a degree of longitude is ~80 km at Toronto's latitude
 *  vs 111 km at the equator) in exchange for cheap pre-computation. */
type FacilityWithDisplay = FacilityRow & { displayLat: number; displayLng: number; clusterSize: number };

function spiderfy(facilities: FacilityRow[]): FacilityWithDisplay[] {
  // Two facilities within CLUSTER_RADIUS degrees of each other are
  // treated as one cluster. 0.005° ≈ 550 m at Toronto's latitude — wide
  // enough to catch same-building / same-complex cases (MaRS, NRC
  // Royalmount, UBC) without absorbing unrelated nearby sites.
  const CLUSTER_RADIUS = 0.005;
  // Ring radius for spiderfied positions. 0.0008° ≈ 88 m: at zoom 14
  // that's ~3 pixels (visible but tight), at zoom 17 it's ~25 pixels
  // (fully clickable), at zoom 6 it's sub-pixel (cluster reads as a
  // single dot — which is what we want at country scale).
  const SPIDER_RADIUS = 0.0008;

  const out: FacilityWithDisplay[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < facilities.length; i++) {
    const anchor = facilities[i];
    if (assigned.has(anchor.id)) continue;
    const group: FacilityRow[] = [anchor];
    assigned.add(anchor.id);
    // Greedy O(N²) cluster build — N is ~120 in the wild, fine.
    for (let j = i + 1; j < facilities.length; j++) {
      const cand = facilities[j];
      if (assigned.has(cand.id)) continue;
      const dx = anchor.lat - cand.lat;
      const dy = anchor.lng - cand.lng;
      if (dx * dx + dy * dy <= CLUSTER_RADIUS * CLUSTER_RADIUS) {
        group.push(cand);
        assigned.add(cand.id);
      }
    }
    if (group.length === 1) {
      out.push({ ...anchor, displayLat: anchor.lat, displayLng: anchor.lng, clusterSize: 1 });
      continue;
    }
    // Cluster centroid — places the ring at the group's centre of mass
    // so a coordinate fix to any one member nudges the whole ring.
    let cLat = 0, cLng = 0;
    for (const m of group) { cLat += m.lat; cLng += m.lng; }
    cLat /= group.length; cLng /= group.length;
    // Arrange members on the ring starting at the top (12 o'clock),
    // sweeping clockwise. Sort by id first so the layout is stable
    // across renders even if the input order shuffles.
    const ordered = [...group].sort((a, b) => a.id.localeCompare(b.id));
    for (let k = 0; k < ordered.length; k++) {
      const angle = (k / ordered.length) * Math.PI * 2 - Math.PI / 2;
      out.push({
        ...ordered[k],
        displayLat: cLat + Math.cos(angle) * SPIDER_RADIUS,
        displayLng: cLng + Math.sin(angle) * SPIDER_RADIUS,
        clusterSize: ordered.length,
      });
    }
  }
  return out;
}

/** A single placed label after collision-avoidance: dot position +
 *  resolved label centre (both in layer-pixel space at the zoom level
 *  of computation) + the facility's id and name. */
interface PlacedLabel {
  id: string;
  name: string;
  dotLat: number;
  dotLng: number;
  labelLat: number;
  labelLng: number;
  width: number;
  height: number;
}

/** Effect-only helpers — defined at MODULE LEVEL, not inside MapInner.
 *
 *  These are CRUCIAL: a previous version of this file defined these
 *  three components nested inside MapInner. That made their function
 *  identity unstable across renders (a new function object every
 *  render), which React treats as a DIFFERENT component type — so
 *  every MapInner render unmounted-and-remounted each helper. The
 *  helpers' on-mount useEffects then re-fired unconditionally, and
 *  LabelLayoutComputer's effect called setLabelLayout, which
 *  triggered another MapInner render, which remounted the helper,
 *  which re-fired the effect, which called setLabelLayout, …
 *  Infinite render loop. The main thread became saturated to the
 *  point Next.js's router couldn't process Link clicks — clicking a
 *  sidebar item would call preventDefault but the resulting
 *  router.push had no slack to actually navigate.
 *
 *  Lifting these to module scope gives them stable identities so
 *  React preserves the instance across MapInner renders, and the
 *  effects only run when their actual dependencies change. */

function FacilitiesZoomTracker({
  Lib, onZoom,
}: {
  Lib: typeof import("react-leaflet");
  onZoom: (z: number) => void;
}) {
  Lib.useMapEvents({
    zoomend: (e) => onZoom(e.target.getZoom()),
  });
  return null;
}

function FacilitiesMapBinder({
  Lib, flyToRef, onMapReady,
}: {
  Lib: typeof import("react-leaflet");
  flyToRef: React.MutableRefObject<((lat: number, lng: number, zoom: number) => void) | null>;
  onMapReady?: (map: unknown) => void;
}) {
  const map = Lib.useMap();
  useEffect(() => {
    flyToRef.current = (lat, lng, z) => map.flyTo([lat, lng], z, { duration: 0.6 });
    // Hand the live map back up to the parent so the "Jump to" chips
    // can call flyToBounds. We don't need a teardown — the map dies
    // with the MapContainer.
    onMapReady?.(map);
    return () => { flyToRef.current = null; };
  }, [map, flyToRef, onMapReady]);
  return null;
}

/** Runs the collision-avoidance pass for facility labels.
 *
 *  Algorithm: greedy placement.
 *   1. Get each facility's screen position (container-pixel space).
 *   2. Compute the label's bounding box for each candidate offset
 *      around the dot (top, NE, E, SE, S, SW, W, NW, plus farther
 *      fallbacks).
 *   3. Place the label at the first offset whose bounding box
 *      doesn't intersect any already-placed label's box.
 *   4. If no offset fits, drop that label — the popup-on-click still
 *      surfaces the name.
 *   5. Convert the chosen pixel position back to lat/lng and persist.
 *      Polylines (leader lines) and Markers (labels) then render
 *      against the resolved lat/lng so panning is free.
 *
 *  Order matters — we sort facilities top-to-bottom by screen y so
 *  northernmost labels get first pick of "above the dot" slots; the
 *  layout is also stable across zoom levels as long as the input
 *  order doesn't shuffle. */
function FacilitiesLabelLayoutComputer({
  Lib, positioned, onLayout,
}: {
  Lib: typeof import("react-leaflet");
  positioned: FacilityWithDisplay[];
  onLayout: (layout: PlacedLabel[]) => void;
}) {
  const map = Lib.useMap();

  // recompute is a useCallback so its identity is stable across
  // renders that don't change positioned/map/onLayout — otherwise
  // the useEffect below would re-fire on every render even after the
  // component-identity fix.
  const recompute = React.useCallback(() => {
    // Read zoom from the map, not from React state — when zoomend
    // fires both ZoomTracker and this computer subscribe to the same
    // event, but React's setZoom is async, so the state value inside
    // any closure is one tick stale. map.getZoom() is always live.
    const z = map.getZoom();
    if (z < 11) { onLayout([]); return; }

    // Pixel width estimate: ~6.4 px per char at 10.5px semibold +
    // 14 px of horizontal padding. Capped at 200 px — longer names
    // are CSS-truncated.
    const widthOf = (s: string) => Math.min(s.length * 6.4 + 14, 200);
    const H = 18;

    type Item = { f: FacilityWithDisplay; x: number; y: number; w: number };
    const items: Item[] = positioned.map((f) => {
      const pt = map.latLngToContainerPoint([f.displayLat, f.displayLng]);
      return { f, x: pt.x, y: pt.y, w: widthOf(f.name) };
    });

    // Filter to those actually inside the viewport — labels for
    // off-screen facilities are wasted compute.
    const size = map.getSize();
    const onScreen = items.filter(
      (it) => it.x > -200 && it.x < size.x + 200 && it.y > -100 && it.y < size.y + 100,
    );

    // North-to-south, then west-to-east — stable, gives "above" slot
    // priority to facilities closer to the top of the viewport.
    onScreen.sort((a, b) => a.y - b.y || a.x - b.x);

    // Candidate label-centre offsets relative to the dot. Order is
    // the placement preference — "above the dot" is tried first.
    // Each [dx, dy] is the offset from the dot to the LABEL CENTRE.
    const OFFSETS: Array<[number, number]> = [
      [0, -18],
      [22, -10], [-22, -10],
      [26, 0],   [-26, 0],
      [22, 12],  [-22, 12],
      [0, 22],
      [0, -38],
      [44, 0],   [-44, 0],
      [0, 40],
    ];

    const placed: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    const out: PlacedLabel[] = [];

    for (const it of onScreen) {
      for (const [dx, dy] of OFFSETS) {
        const cx = it.x + dx;
        const cy = it.y + dy;
        const left = cx - it.w / 2;
        const top = cy - H / 2;
        const right = cx + it.w / 2;
        const bottom = cy + H / 2;
        const M = 2;
        const overlap = placed.some(
          (r) => !(r.right + M < left || r.left - M > right || r.bottom + M < top || r.top - M > bottom),
        );
        if (overlap) continue;
        placed.push({ left, top, right, bottom });
        const labelLatLng = map.containerPointToLatLng([cx, cy]);
        out.push({
          id: it.f.id,
          name: it.f.name,
          dotLat: it.f.displayLat,
          dotLng: it.f.displayLng,
          labelLat: labelLatLng.lat,
          labelLng: labelLatLng.lng,
          width: it.w,
          height: H,
        });
        break;
      }
    }
    onLayout(out);
  }, [map, positioned, onLayout]);

  // Recompute on:
  //   - zoomend → pixel offsets change with zoom
  //   - moveend → viewport content changes, new facilities slide in
  Lib.useMapEvents({
    zoomend: () => recompute(),
    moveend: () => recompute(),
  });

  // Run on mount + whenever positioned changes (province filter)
  useEffect(() => { recompute(); }, [recompute]);

  return null;
}

function MapInner({
  Lib, facilities, onSelect, onMapReady,
}: {
  Lib: typeof import("react-leaflet");
  facilities: FacilityRow[];
  onSelect: (f: FacilityRow | null) => void;
  onMapReady?: (map: unknown) => void;
}) {
  const { MapContainer, TileLayer, CircleMarker, Popup, Marker, Polyline, useMap, useMapEvents } = Lib;

  // Leaflet's full namespace — dynamic-imported to dodge SSR's "window
  // is not defined" trap. We need `L.divIcon` for rendering label HTML
  // as a real Marker; react-leaflet doesn't re-export that constructor.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [L, setL] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      if (cancelled) return;
      // Leaflet's default export is the namespace; some bundlers strip
      // the .default, so fall through.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setL((mod as any).default ?? mod);
    });
    return () => { cancelled = true; };
  }, []);
  // Track zoom so we can scale marker radius. Higher zoom = more
  // detail = larger markers; lower zoom = compact dots.
  const [zoom, setZoom] = useState(5);

  // Imperative "fly to" handle — populated by a small effect-only
  // child component that has access to the Leaflet map instance.
  const flyToRef = useRef<((lat: number, lng: number, zoom: number) => void) | null>(null);

  // Spiderfy clustered markers. Memoised on the facilities array
  // identity so we don't recompute every render — only when the
  // visible-facilities set changes (e.g. when the province filter
  // flips).
  const positioned = useMemo(() => spiderfy(facilities), [facilities]);

  // Collision-resolved label layout. Recomputed whenever zoom changes
  // (label pixel offsets depend on zoom) or the visible set changes.
  // Pan is handled automatically by Leaflet because labels are
  // anchored to lat/lng, not pixel offsets — but we DO need to recompute
  // pixel-space positions on zoom because the projection changes.
  const [labelLayout, setLabelLayout] = useState<PlacedLabel[]>([]);
  // Wrap setLabelLayout in a stable callback for the
  // FacilitiesLabelLayoutComputer's effect dependency array.
  const handleLabelLayout = useCallback((layout: PlacedLabel[]) => setLabelLayout(layout), []);
  // Same for the zoom tracker.
  const handleZoom = useCallback((z: number) => setZoom(z), []);

  // For each cluster, also derive a "leg" line from the centroid out
  // to each spiderfied member. Only drawn when zoomed in (≥13) — at
  // lower zoom the ring is too small for the legs to read.
  const clusterLegs = useMemo(() => {
    if (zoom < 13) return [] as Array<{ from: [number, number]; to: [number, number]; id: string }>;
    const legs: Array<{ from: [number, number]; to: [number, number]; id: string }> = [];
    // Re-derive centroid from spiderfied positions: the displayLat/Lng
    // of cluster members average back to the cluster centroid because
    // they were placed on a symmetric ring.
    const byClusterKey = new Map<string, FacilityWithDisplay[]>();
    for (const f of positioned) {
      if (f.clusterSize === 1) continue;
      // Round-key by display centroid so all members of a cluster share a key.
      // We reuse the average of all members to derive the key inside the loop below.
      const k = `${f.clusterSize}:${Math.round(f.displayLat * 10000) % 10000}`; // weak grouping ok for small N
      const cur = byClusterKey.get(k) ?? [];
      cur.push(f);
      byClusterKey.set(k, cur);
    }
    for (const members of byClusterKey.values()) {
      let cLat = 0, cLng = 0;
      for (const m of members) { cLat += m.displayLat; cLng += m.displayLng; }
      cLat /= members.length; cLng /= members.length;
      for (const m of members) {
        legs.push({ from: [cLat, cLng], to: [m.displayLat, m.displayLng], id: m.id });
      }
    }
    return legs;
  }, [positioned, zoom]);

  // Default view — Canada-wide.
  const center: [number, number] = [55.0, -97.0];

  return (
    <MapContainer
      center={center}
      zoom={4}
      minZoom={3}
      // OSM tiles go to zoom 19; capping at 18 keeps one level of headroom
      // for tile-server safety and gives plenty of street-level detail.
      // The earlier cap of 14 was too tight — at zoom 14 a single pixel
      // covers ~10 m, which makes shared-building MaRS-style clusters
      // unreadable even after spiderfying.
      maxZoom={18}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FacilitiesZoomTracker Lib={Lib} onZoom={handleZoom} />
      <FacilitiesMapBinder Lib={Lib} flyToRef={flyToRef} onMapReady={onMapReady} />
      <FacilitiesLabelLayoutComputer Lib={Lib} positioned={positioned} onLayout={handleLabelLayout} />
      {/* Cluster connector lines — only at higher zoom. Non-interactive
          so they don't intercept marker clicks when the user clicks
          near the line (Leaflet's hit-testing happens against the
          painted SVG path geometry, which has a wider hit region than
          the visible 1-px stroke). */}
      {clusterLegs.map((leg) => (
        <Polyline
          key={`leg-${leg.id}`}
          positions={[leg.from, leg.to]}
          pathOptions={{
            color: "#6b7280",
            weight: 1,
            opacity: 0.45,
            dashArray: "2,3",
          }}
          interactive={false}
        />
      ))}
      {/* Label leader lines — rendered BEFORE the dots so the dots
          paint over the line's endpoint at the dot side. The label
          side is the line's natural terminus inside the label pill. */}
      {labelLayout.map((p) => (
        <Polyline
          key={`leader-${p.id}`}
          positions={[[p.dotLat, p.dotLng], [p.labelLat, p.labelLng]]}
          pathOptions={{
            color: "#6b7280",
            weight: 1,
            opacity: 0.55,
          }}
          interactive={false}
        />
      ))}
      {positioned.map((f) => {
        const accent = statusAccent(f.status);
        // Radius scales with zoom — 5 at zoom 4, up to 11 at zoom 12+.
        const radius = Math.max(5, Math.min(11, 4 + (zoom - 3)));
        return (
          <CircleMarker
            key={f.id}
            center={[f.displayLat, f.displayLng]}
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
            {/* autoPan: false — without this, opening the popup near
                the edge of the viewport pans the map to bring the
                popup into view, which fires moveend → the label
                layout recomputes → MapInner re-renders. The animation
                + recompute pipeline made the page feel sluggish for
                a beat after every dot click. autoPan: false keeps
                the camera still; if the popup hangs off the edge the
                user can pan manually. */}
            <Popup autoPan={false}>
              <FacilityPopupContent facility={f} accent={accent} clusterSize={f.clusterSize} />
            </Popup>
          </CircleMarker>
        );
      })}
      {/* Label markers — DivIcon HTML rendered in the marker pane (z
          600), so labels paint above everything in the overlay pane
          (tiles, dot CircleMarkers, polylines). Each label is a tiny
          Marker positioned at its resolved collision-free lat/lng. */}
      {L && labelLayout.map((p) => {
        const html = `<div class="facility-name-tag" style="width:${p.width}px;">` +
                     p.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") +
                     `</div>`;
        const icon = L.divIcon({
          html,
          className: "facility-label-divicon",
          iconSize: [p.width, p.height],
          iconAnchor: [p.width / 2, p.height / 2],
        });
        return (
          <Marker
            key={`label-${p.id}`}
            position={[p.labelLat, p.labelLng]}
            icon={icon}
            interactive={false}
            keyboard={false}
          />
        );
      })}
    </MapContainer>
  );
}

// ──────────────────────────────────────────────────────────────────
// Popup content — what shows up inside the Leaflet popup.
// ──────────────────────────────────────────────────────────────────

function FacilityPopupContent({
  facility, accent, clusterSize = 1,
}: {
  facility: FacilityRow;
  accent: string;
  clusterSize?: number;
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
      {clusterSize > 1 && (
        <p className="text-[10.5px] text-fg-subtle italic m-0">
          1 of {clusterSize} facilities sharing this location — zoom in to see the rest.
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
