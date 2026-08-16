"use client";

import { useMemo, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import topology from "@/data/countries-110m.json";
import {
  geographicCountryLabel,
  isMappableCountryCode,
  numericCountryIdToAlpha2,
} from "@/lib/geographic-country-label";
import { formatEuro, formatPercent } from "@/lib/utils";
import type { GeographicSlice } from "@patrimo/core/geographic-exposure";

const WIDTH = 800;
const HEIGHT = 420;
const EMPTY_FILL = "#e4e4e7";
const ACTIVE_FILL = "#059669";

type CountryFeature = Feature<Geometry, Record<string, unknown>> & {
  id?: string | number;
};

function buildCountryCollection(): FeatureCollection {
  return feature(
    topology as never,
    (topology as { objects: { countries: unknown } }).objects.countries as never,
  ) as unknown as FeatureCollection;
}

function fillForWeight(weight: number, maxWeight: number): string {
  if (weight <= 0 || maxWeight <= 0) return EMPTY_FILL;
  const intensity = Math.max(0.2, Math.min(1, weight / maxWeight));
  const alpha = 0.25 + intensity * 0.75;
  return `color-mix(in srgb, ${ACTIVE_FILL} ${Math.round(alpha * 100)}%, ${EMPTY_FILL})`;
}

export function GeographicWorldMap({
  countries,
}: {
  countries: GeographicSlice[];
}) {
  const [hovered, setHovered] = useState<GeographicSlice | null>(null);

  const byCode = useMemo(() => {
    const map = new Map<string, GeographicSlice>();
    for (const slice of countries) {
      const code = slice.key.trim().toUpperCase();
      if (!isMappableCountryCode(code)) continue;
      map.set(code, { ...slice, key: code });
    }
    return map;
  }, [countries]);

  const maxWeight = useMemo(
    () => Math.max(0, ...[...byCode.values()].map((slice) => slice.weight)),
    [byCode],
  );

  const { pathGenerator, geographies } = useMemo(() => {
    const collection = buildCountryCollection();
    const projection = geoEqualEarth().fitSize([WIDTH, HEIGHT], collection);
    return {
      pathGenerator: geoPath(projection),
      geographies: collection.features as CountryFeature[],
    };
  }, []);

  return (
    <div className="relative w-full" data-testid="geographic-world-map">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Carte de répartition géographique"
      >
        {geographies.map((geo, index) => {
          const iso = numericCountryIdToAlpha2(geo.id ?? "");
          const slice = iso ? byCode.get(iso) : undefined;
          const d = pathGenerator(geo);
          if (!d) return null;
          return (
            <path
              key={iso ?? `geo-${index}`}
              d={d}
              data-testid={iso ? `geo-country-${iso}` : undefined}
              fill={slice ? fillForWeight(slice.weight, maxWeight) : EMPTY_FILL}
              stroke="#fff"
              strokeWidth={0.4}
              className={slice ? "cursor-pointer" : undefined}
              onMouseEnter={() => {
                if (slice) setHovered(slice);
              }}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      {hovered && (
        <div
          data-testid="geographic-map-tooltip"
          className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-zinc-900 px-3 py-2 text-sm text-white shadow dark:bg-zinc-100 dark:text-zinc-900"
        >
          {geographicCountryLabel(hovered.key)} · {formatEuro(hovered.marketValue)}{" "}
          · {formatPercent(hovered.weight)}
        </div>
      )}
    </div>
  );
}
