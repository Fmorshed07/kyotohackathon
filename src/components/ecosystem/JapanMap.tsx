import { useId } from "react";
import japan from "@/data/japan-map.json";
import { JAPAN_CITIES, projectJapanPoint, type JapanCity } from "@/lib/communityEcosystem";

export default function JapanMap({ selected, onSelect }: { selected: JapanCity; onSelect: (city: JapanCity) => void }) {
  const patternId = useId();
  return (
    <div className="japan-map" aria-label="Explore Cognisor programmes in Japan">
      <svg viewBox="0 0 650 600" aria-hidden="true" className="japan-map-art">
        <defs>
          <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="currentColor" /></pattern>
        </defs>
        <g className="japan-graticule">{[100, 200, 300, 400, 500].map(y => <path key={y} d={`M20 ${y}H630 M${y} 20V580`} />)}</g>
        <g className="japan-land">{japan.paths.map((d, i) => <path key={i} d={d} />)}</g>
        <g className="japan-land-dots" fill={`url(#${patternId})`}>{japan.paths.map((d, i) => <path key={i} d={d} />)}</g>
        <path className="japan-connection" d="M442.3 257.8 Q404 212 344.2 274.7 Q325 296 337.6 282.7" />
        {JAPAN_CITIES.map(city => {
          const point = projectJapanPoint(city.lon, city.lat);
          const active = city.id === selected.id;
          return <g key={city.id} className={active ? "japan-city is-selected" : "japan-city"}>
            <path className="japan-callout" d={`M${point.x} ${point.y}L${city.labelX} ${city.labelY}`} />
            {active && <circle className="japan-pulse" cx={point.x} cy={point.y} r="18" />}
            <circle className="japan-city-dot" cx={point.x} cy={point.y} r={active ? 5 : 3.5} />
          </g>;
        })}
        <text x="40" y="130" className="map-ocean-label">SEA OF JAPAN</text>
        <text x="452" y="455" className="map-ocean-label">PACIFIC OCEAN</text>
        <text x="490" y="94" className="map-region-label">北海道</text>
        <text x="380" y="215" className="map-region-label">本州</text>
        <text x="215" y="373" className="map-region-label">九州</text>
      </svg>
      {JAPAN_CITIES.map(city => <button key={city.id} type="button" className="japan-map-label" aria-pressed={selected.id === city.id} aria-label={`Explore ${city.id}`} onClick={() => onSelect(city)} style={{ left: `${city.labelX / 650 * 100}%`, top: `${city.labelY / 600 * 100}%` }}><span>{city.id}</span><small lang="ja">{city.japanese}</small></button>)}
      <div className="japan-map-coordinate"><span>35.6762° N / 139.6503° E</span><span>日本から、世界へ。</span></div>
    </div>
  );
}
