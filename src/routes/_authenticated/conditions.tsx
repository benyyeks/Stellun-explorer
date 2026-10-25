// Local observing conditions — full-day outlook from Open-Meteo.
// Distinct from /weather (space weather / NOAA).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getEarthWeather } from "@/lib/stellun-data.functions";
import { useObserverLocation } from "@/lib/location";

export const Route = createFileRoute("/_authenticated/conditions")({
  head: () => ({
    meta: [
      { title: "Observing conditions - STELLUN" },
      {
        name: "description",
        content:
          "Local temperature, cloud cover, and precipitation through the day for stargazing plans. Educational use — not an official forecast service.",
      },
    ],
  }),
  component: ConditionsPage,
});

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
  96: "Thunderstorm + hail",
  99: "Severe thunderstorm",
};

type Current = {
  time?: string;
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  cloud_cover?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  precipitation?: number;
  pressure_msl?: number;
  is_day?: number;
};

type Hourly = {
  time: string[];
  temperature_2m: (number | null)[];
  cloud_cover: (number | null)[];
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  weather_code: (number | null)[];
  wind_speed_10m: (number | null)[];
  is_day: (number | null)[];
};

type Daily = {
 Reviewing the Sky Tonight page and weather data paths so we can add a full-day forecast with a space-appropriate layout.Plan: expand the earth-weather API for a full-day hourly series, then add an observing-weather panel on **Sky Tonight** (space aesthetic, not a generic weather app).
;
---

## Structure

| Layer | Role |
|--------|------|
| `getEarthWeather` | Open-Meteo: **current** + **hourly for today/tomorrow** (cloud, precip chance, temp, code) |
| Sky Tonight section | “Observing conditions” under location controls — full-day strip + “best windows” |
| Homepage widget | Stays **current only** (already separate) |

Space feel: glass cards, mono times, cloud % as the hero metric (stargazing), soft day/night tone — not bright “rain radar” chrome.

---

## 1) Expand API — `src/lib/stellun-data.functions.ts`

**Find** the whole `getEarthWeather` block:

```ts
export const getEarthWeather = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => WeatherInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const current =
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl,is_day";
    // Full observing day: code + visibility help rank “best windows”
    const hourly =
      "temperature_2m,apparent_temperature,cloud_cover,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility,is_day";
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=\( {data.lat}&longitude= \){data.lon}` +
      `&current=\( {current}&hourly= \){hourly}&forecast_days=2&timezone=auto`;
    // 5 min cache; same lat/lon key — safe for homepage + sky
    return cached("weather-earth", { lat: +data.lat.toFixed(3), lon: +data.lon.toFixed(3) }, 300, () =>
      fetchJson(url, { timeoutMs: 12000 }),
    );
  });
