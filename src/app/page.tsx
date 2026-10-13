"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Armchair,
  CloudRain,
  Droplets,
  Leaf,
  MapPin,
  Sun,
  Thermometer,
  Trees,
  Wind,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Place = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  shade_description: string | null;
  has_trees: boolean | null;
  has_seating: boolean | null;
  sun_exposure: string | null;
  source_url: string;
  verified_at: string;
};

type ForecastHour = {
  time: number;
  apparentTemperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  precipitationProbability: number | null;
};

type OpenMeteoResponse = {
  hourly?: {
    time?: number[];
    apparent_temperature?: (number | null)[];
    relative_humidity_2m?: (number | null)[];
    wind_speed_10m?: (number | null)[];
    precipitation_probability?: (number | null)[];
  };
};

type ComfortEstimate = {
  place: Place;
  score: number;
  rank: number;
  isTied: boolean;
  label: string;
  forecastReasons: string[];
  placeReasons: string[];
};

const iloiloTimeZone = "Asia/Manila";

function formatForecastTime(timestamp: number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-PH", {
    ...options,
    timeZone: iloiloTimeZone,
  }).format(new Date(timestamp * 1000));
}

function displayForecastValue(value: number | null, unit: string) {
  return value === null ? "Unavailable" : `${Math.round(value)}${unit}`;
}

function hasFullForecast(forecast: ForecastHour | undefined): forecast is ForecastHour {
  return Boolean(
    forecast &&
      forecast.apparentTemperature !== null &&
      forecast.humidity !== null &&
      forecast.windSpeed !== null &&
      forecast.precipitationProbability !== null,
  );
}

function getWeatherScore(forecast: ForecastHour) {
  let score = 50;
  const reasons: string[] = [];
  const apparentTemperature = forecast.apparentTemperature ?? 0;
  const humidity = forecast.humidity ?? 0;
  const windSpeed = forecast.windSpeed ?? 0;
  const rainChance = forecast.precipitationProbability ?? 0;

  if (apparentTemperature >= 34) {
    score -= 18;
    reasons.push("Very warm feels-like temperatures lower the estimate.");
  } else if (apparentTemperature >= 30) {
    score -= 10;
    reasons.push("Warm feels-like temperatures lower the estimate.");
  } else if (apparentTemperature <= 22) {
    score += 8;
    reasons.push("Milder temperatures support outdoor comfort.");
  } else {
    reasons.push("Feels-like temperature is in the estimate’s middle range.");
  }

  if (humidity >= 85) {
    score -= 14;
    reasons.push("High humidity lowers the estimate.");
  } else if (humidity >= 70) {
    score -= 7;
    reasons.push("Elevated humidity slightly lowers the estimate.");
  } else if (humidity <= 60) {
    score += 4;
    reasons.push("Lower humidity supports outdoor comfort.");
  } else {
    reasons.push("Humidity is in the estimate’s middle range.");
  }

  if (windSpeed < 3) {
    score -= 4;
    reasons.push("Very light wind provides little breeze.");
  } else if (windSpeed <= 18) {
    score += 5;
    reasons.push("Moderate forecast wind supports a pleasant breeze.");
  } else if (windSpeed > 30) {
    score -= 7;
    reasons.push("Strong forecast wind lowers the estimate.");
  } else {
    reasons.push("Forecast wind is outside the moderate-breeze range.");
  }

  if (rainChance >= 70) {
    score -= 25;
    reasons.push("High rain probability weighs strongly against outdoor plans.");
  } else if (rainChance >= 40) {
    score -= 14;
    reasons.push("Rain is possible, which lowers the estimate.");
  } else if (rainChance >= 20) {
    score -= 6;
    reasons.push("Some rain risk slightly lowers the estimate.");
  } else if (rainChance <= 10) {
    score += 3;
    reasons.push("Low rain probability supports outdoor plans.");
  } else {
    reasons.push("Rain probability is in the estimate’s middle range.");
  }

  return { score, reasons };
}

function getPlaceAdjustment(place: Place, forecast: ForecastHour) {
  let score = 0;
  const reasons: string[] = [];
  const warmConditions =
    (forecast.apparentTemperature ?? 0) >= 29 || (forecast.humidity ?? 0) >= 75;

  if (place.has_seating === true) {
    score += 4;
    reasons.push("Recorded seating adds a small rest-friendly adjustment.");
  } else if (place.has_seating === false) {
    score -= 3;
    reasons.push("Seating is recorded as unavailable, so no seating benefit is included.");
  } else {
    reasons.push("Seating is not verified and does not affect the estimate.");
  }

  if (place.has_trees === true && warmConditions) {
    score += 6;
    reasons.push("Recorded trees add support in warm or humid conditions; they do not guarantee shade.");
  } else if (place.has_trees === false && warmConditions) {
    reasons.push("No trees are recorded, so there is no tree-related adjustment; other shade may still exist.");
  } else if (place.has_trees === null) {
    reasons.push("Trees are not verified and do not affect the estimate.");
  } else {
    reasons.push("Recorded trees do not change the estimate in these conditions.");
  }

  const shadeDescription = place.shade_description?.toLowerCase() ?? "";
  if (warmConditions && shadeDescription) {
    if (/no shade|little shade|limited shade|full sun|direct sun|unshaded/.test(shadeDescription)) {
      score -= 6;
      reasons.push(`Recorded shade detail (“${place.shade_description}”) lowers the estimate in warm or humid conditions.`);
    } else if (/ample shade|good shade|mostly shaded|partial shade|tree shade|covered/.test(shadeDescription)) {
      score += 6;
      reasons.push(`Recorded shade detail (“${place.shade_description}”) supports the estimate in warm or humid conditions.`);
    } else {
      reasons.push(`Shade detail (“${place.shade_description}”) is shown but not scored because its wording is not covered by the simple rules.`);
    }
  } else if (!place.shade_description) {
    reasons.push("Shade is not verified and does not affect the estimate.");
  } else {
    reasons.push(`Recorded shade detail: ${place.shade_description}; it does not change the estimate in these conditions.`);
  }

  const exposure = place.sun_exposure?.toLowerCase() ?? "";
  if (warmConditions && exposure) {
    if (/full sun|direct sun|high exposure|fully exposed/.test(exposure)) {
      score -= 5;
      reasons.push(`Recorded sun exposure (“${place.sun_exposure}”) lowers the estimate in warm or humid conditions.`);
    } else if (/partial shade|mostly shaded|low exposure|shaded/.test(exposure)) {
      score += 5;
      reasons.push(`Recorded sun exposure (“${place.sun_exposure}”) supports the estimate in warm or humid conditions.`);
    } else {
      reasons.push(`Sun exposure (“${place.sun_exposure}”) is shown but not scored by the simple rules.`);
    }
  } else if (!place.sun_exposure) {
    reasons.push("Sun exposure is not verified and does not affect the estimate.");
  } else {
    reasons.push(`Recorded sun exposure: ${place.sun_exposure}; it does not change the estimate in these conditions.`);
  }

  return { score, reasons };
}

function rankPlaces(places: Place[], forecast: ForecastHour): ComfortEstimate[] {
  const weather = getWeatherScore(forecast);
  const estimates = places.map((place) => {
    const placeAdjustment = getPlaceAdjustment(place, forecast);
    return {
      place,
      score: weather.score + placeAdjustment.score,
      rank: 0,
      isTied: false,
      label: "",
      forecastReasons: weather.reasons,
      placeReasons: placeAdjustment.reasons,
    };
  });

  estimates.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
  estimates.forEach((estimate) => {
    estimate.rank = estimates.findIndex((candidate) => candidate.score === estimate.score) + 1;
    estimate.isTied = estimates.filter((candidate) => candidate.score === estimate.score).length > 1;
    estimate.label =
      estimate.score >= 70
        ? "More favorable estimate"
        : estimate.score >= 50
          ? "Mixed conditions"
          : "Less favorable estimate";
  });

  return estimates;
}

function recordedValue(value: boolean | null) {
  if (value === null) return "Not verified";
  return value ? "Available" : "Not recorded";
}

function formatCheckedDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

export default function Home() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [forecastHours, setForecastHours] = useState<ForecastHour[]>([]);
  const [selectedForecastTime, setSelectedForecastTime] = useState<number | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [hasForecastError, setHasForecastError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadPlaces() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("places")
          .select(
            "id, name, latitude, longitude, description, shade_description, has_trees, has_seating, sun_exposure, source_url, verified_at",
          )
          .order("name");

        if (error) throw error;
        if (isCurrent) setPlaces((data ?? []) as Place[]);
      } catch {
        if (isCurrent) setHasError(true);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadPlaces();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadForecast() {
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.search = new URLSearchParams({
          latitude: "10.7202",
          longitude: "122.5621",
          hourly:
            "apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation_probability",
          timezone: iloiloTimeZone,
          timeformat: "unixtime",
          forecast_days: "2",
          temperature_unit: "celsius",
          wind_speed_unit: "kmh",
        }).toString();

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Forecast request failed");

        const result = (await response.json()) as OpenMeteoResponse;
        const hourly = result.hourly;
        if (
          !hourly?.time ||
          !hourly.apparent_temperature ||
          !hourly.relative_humidity_2m ||
          !hourly.wind_speed_10m ||
          !hourly.precipitation_probability
        ) {
          throw new Error("Forecast response is incomplete");
        }

        const now = Date.now();
        const upcomingHours = hourly.time
          .map((time, index) => ({
            time,
            apparentTemperature: hourly.apparent_temperature?.[index] ?? null,
            humidity: hourly.relative_humidity_2m?.[index] ?? null,
            windSpeed: hourly.wind_speed_10m?.[index] ?? null,
            precipitationProbability:
              hourly.precipitation_probability?.[index] ?? null,
          }))
          .filter((hour) => hour.time * 1000 >= now);

        if (upcomingHours.length === 0) throw new Error("No upcoming forecast hours");
        setForecastHours(upcomingHours);
        setSelectedForecastTime(upcomingHours[0].time);
      } catch (error) {
        if (!controller.signal.aborted) setHasForecastError(true);
      } finally {
        if (!controller.signal.aborted) setIsForecastLoading(false);
      }
    }

    void loadForecast();
    return () => controller.abort();
  }, []);

  const selectedForecast = forecastHours.find(
    (hour) => hour.time === selectedForecastTime,
  );
  const canRankSpots = hasFullForecast(selectedForecast);
  const comfortEstimates = canRankSpots
    ? rankPlaces(places, selectedForecast)
    : [];
  const estimatesAreTied =
    comfortEstimates.length > 1 &&
    comfortEstimates.every((estimate) => estimate.score === comfortEstimates[0].score);
  const displayedPlaces = canRankSpots
    ? comfortEstimates.map((estimate) => estimate.place)
    : places;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-16">
      <header className="max-w-2xl space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-emerald-900/5 px-3 py-1 text-xs font-medium text-emerald-900 dark:text-emerald-200">
          <Leaf aria-hidden="true" className="size-3.5" /> Iloilo Outdoor Comfort Finder
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find your kind of outside.
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          Explore outdoor places around Iloilo City. Compare their documented features
          and open a spot in your map app to plan your visit.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Hourly forecast for Iloilo City</CardTitle>
          <CardDescription>
            Area-level forecast estimates from{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
            >
              Open-Meteo
            </a>
            . Conditions at an individual spot may differ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isForecastLoading ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading the hourly forecast…
            </p>
          ) : hasForecastError ? (
            <p className="text-sm text-destructive" role="alert">
              We couldn’t load the weather forecast. Check your connection and refresh the page to try again.
            </p>
          ) : selectedForecast ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="forecast-hour">
                  Choose a forecast hour
                  <select
                    className="h-10 min-w-56 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    id="forecast-hour"
                    value={selectedForecast.time}
                    onChange={(event) => setSelectedForecastTime(Number(event.target.value))}
                  >
                    {forecastHours.map((hour) => (
                      <option key={hour.time} value={hour.time}>
                        {formatForecastTime(hour.time, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-muted-foreground">
                  Forecast for {formatForecastTime(selectedForecast.time, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })} (Iloilo time)
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                  <dt className="flex items-center gap-2 text-sm font-medium"><Thermometer aria-hidden="true" className="size-4" />Feels like</dt>
                  <dd className="text-lg font-semibold">{displayForecastValue(selectedForecast.apparentTemperature, "°C")}</dd>
                </div>
                <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                  <dt className="flex items-center gap-2 text-sm font-medium"><Droplets aria-hidden="true" className="size-4" />Humidity</dt>
                  <dd className="text-lg font-semibold">{displayForecastValue(selectedForecast.humidity, "%")}</dd>
                </div>
                <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                  <dt className="flex items-center gap-2 text-sm font-medium"><Wind aria-hidden="true" className="size-4" />Wind</dt>
                  <dd className="text-lg font-semibold">{displayForecastValue(selectedForecast.windSpeed, " km/h")}</dd>
                </div>
                <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                  <dt className="flex items-center gap-2 text-sm font-medium"><CloudRain aria-hidden="true" className="size-4" />Rain chance</dt>
                  <dd className="text-lg font-semibold">{displayForecastValue(selectedForecast.precipitationProbability, "%")}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              No upcoming forecast hours are currently available.
            </p>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="spots-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="spots-heading" className="text-xl font-semibold">Outdoor spots in Iloilo City</h2>
          <p className="text-sm text-muted-foreground">
            Place features are preliminary details reported by the linked online sources,
            not recent on-site checks. Sun exposure and other unsupported details remain unverified.
          </p>
        </div>

        {canRankSpots ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>
              These are rule-based comfort estimates for the selected forecast hour. The same area-level weather forecast is used for every spot; recorded shade, trees, sun exposure, and seating can change each spot’s estimate. Unverified features do not affect its score.
            </p>
            <p>
              Estimates are not measurements or guarantees of the exact conditions at a spot.
              {estimatesAreTied
                ? " These places currently tie because the recorded features do not distinguish their estimates."
                : " Spot details come from the source and check date shown on each card."}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground" role="status">
            {isForecastLoading
              ? "The forecast is loading. Spots are shown alphabetically and will remain unranked until a complete forecast is available."
              : "A complete forecast is not available, so there is no weather-based ranking. Spots are shown alphabetically without a current comfort estimate."}
          </p>
        )}

        {isLoading ? (
          <Card><CardContent className="p-6">
            <p className="text-sm text-muted-foreground" role="status">Loading outdoor spots…</p>
          </CardContent></Card>
        ) : hasError ? (
          <Card><CardContent className="p-6">
            <p className="text-sm text-destructive" role="alert">
              We couldn’t load the outdoor spots. Please check your connection and try refreshing the page.
            </p>
          </CardContent></Card>
        ) : places.length === 0 ? (
          <Card><CardContent className="p-6">
            <p className="text-sm text-muted-foreground">There are no outdoor spots in the catalog yet. Please check back later.</p>
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {displayedPlaces.map((place) => {
              const estimate = comfortEstimates.find((item) => item.place.id === place.id);
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
              return (
                <Card className="flex flex-col overflow-hidden" key={place.id}>
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <CardTitle className="text-xl">{place.name}</CardTitle>
                        {estimate ? (
                          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                            Rank #{estimate.rank}{estimate.isTied ? " (tie)" : ""} · {estimate.label}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not ranked</p>
                        )}
                        <CardDescription className="flex items-center gap-1.5">
                          <MapPin aria-hidden="true" className="size-3.5 shrink-0" /> Iloilo City
                        </CardDescription>
                      </div>
                      <a
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${place.name} in Google Maps`}
                      >
                        Map <ArrowUpRight aria-hidden="true" className="size-4" />
                      </a>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{place.description}</p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5">
                    {estimate ? (
                      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                        <div>
                          <p className="font-medium">Forecast factors</p>
                          <p className="mt-1 leading-6 text-muted-foreground">
                            Feels like {displayForecastValue(selectedForecast?.apparentTemperature ?? null, "°C")}, humidity {displayForecastValue(selectedForecast?.humidity ?? null, "%")}, wind {displayForecastValue(selectedForecast?.windSpeed ?? null, " km/h")}, and rain chance {displayForecastValue(selectedForecast?.precipitationProbability ?? null, "%")}. {estimate.forecastReasons.join(" ")}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Documented spot features</p>
                          <p className="mt-1 leading-6 text-muted-foreground">
                            {estimate.placeReasons.join(" ")}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                        <dt className="flex items-center gap-2 font-medium"><Sun aria-hidden="true" className="size-4" />Shade</dt>
                        <dd className="text-muted-foreground">{place.shade_description || "Not verified"}</dd>
                      </div>
                      <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                        <dt className="flex items-center gap-2 font-medium"><Trees aria-hidden="true" className="size-4" />Trees</dt>
                        <dd className="text-muted-foreground">{recordedValue(place.has_trees)}</dd>
                      </div>
                      <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                        <dt className="flex items-center gap-2 font-medium"><Armchair aria-hidden="true" className="size-4" />Seating</dt>
                        <dd className="text-muted-foreground">{recordedValue(place.has_seating)}</dd>
                      </div>
                      <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                        <dt className="flex items-center gap-2 font-medium"><Sun aria-hidden="true" className="size-4" />Sun exposure</dt>
                        <dd className="text-muted-foreground">{place.sun_exposure || "Not verified"}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                      <p>Source checked {formatCheckedDate(place.verified_at)}</p>
                      <a className="mt-1 inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground" href={place.source_url} target="_blank" rel="noreferrer">
                        Information source <ArrowUpRight aria-hidden="true" className="size-3.5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
