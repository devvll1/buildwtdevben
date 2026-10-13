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
    reasons.push("It may feel very hot, which can make an outdoor break less comfortable.");
  } else if (apparentTemperature >= 30) {
    score -= 10;
    reasons.push("It may feel warm, so look for shade if you head out.");
  } else if (apparentTemperature <= 22) {
    score += 8;
    reasons.push("The milder temperature could make it a nice time to be outside.");
  } else {
    reasons.push("The feels-like temperature looks fairly manageable.");
  }

  if (humidity >= 85) {
    score -= 14;
    reasons.push("It may feel muggy, so take it easy and stay hydrated.");
  } else if (humidity >= 70) {
    score -= 7;
    reasons.push("Humidity is on the high side and may make it feel warmer.");
  } else if (humidity <= 60) {
    score += 4;
    reasons.push("Lower humidity may make the air feel more comfortable.");
  } else {
    reasons.push("Humidity looks moderate for this forecast.");
  }

  if (windSpeed < 3) {
    score -= 4;
    reasons.push("There may not be much of a breeze.");
  } else if (windSpeed <= 18) {
    score += 5;
    reasons.push("A gentle-to-moderate breeze could make it pleasant outside.");
  } else if (windSpeed > 30) {
    score -= 7;
    reasons.push("The wind may feel quite strong at this hour.");
  } else {
    reasons.push("The breeze may feel lighter or stronger than you’d like.");
  }

  if (rainChance >= 70) {
    score -= 25;
    reasons.push("Rain looks likely, so you may want to keep an indoor option handy.");
  } else if (rainChance >= 40) {
    score -= 14;
    reasons.push("Rain is possible; bring an umbrella or choose a covered plan.");
  } else if (rainChance >= 20) {
    score -= 6;
    reasons.push("There’s a small chance of rain, so keep an eye on the sky.");
  } else if (rainChance <= 10) {
    score += 3;
    reasons.push("Rain looks unlikely, which is a nice sign for outdoor plans.");
  } else {
    reasons.push("There’s some uncertainty about rain at this hour.");
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
    reasons.push("The source reports seating, which could make resting easier.");
  } else if (place.has_seating === false) {
    score -= 3;
    reasons.push("The source doesn’t list seating, so I can’t count on a place to sit.");
  } else {
    reasons.push("Seating hasn’t been checked yet, so it doesn’t affect this estimate.");
  }

  if (place.has_trees === true && warmConditions) {
    score += 6;
    reasons.push("Trees are reported here and may offer some relief in warm weather, though they don’t guarantee shade.");
  } else if (place.has_trees === false && warmConditions) {
    reasons.push("The source doesn’t list trees, though other kinds of shade may still be around.");
  } else if (place.has_trees === null) {
    reasons.push("Trees haven’t been checked yet, so they don’t affect this estimate.");
  } else {
    reasons.push("The trees listed for this spot don’t change the estimate in these conditions.");
  }

  const shadeDescription = place.shade_description?.toLowerCase() ?? "";
  if (warmConditions && shadeDescription) {
    if (/no shade|little shade|limited shade|full sun|direct sun|unshaded/.test(shadeDescription)) {
      score -= 6;
      reasons.push(`The listed shade detail (“${place.shade_description}”) may make warm weather feel tougher.`);
    } else if (/ample shade|good shade|mostly shaded|partial shade|tree shade|covered/.test(shadeDescription)) {
      score += 6;
      reasons.push(`The listed shade detail (“${place.shade_description}”) could make a warm day more comfortable.`);
    } else {
      reasons.push(`The source mentions shade (“${place.shade_description}”), but I can’t tell from that detail how much comfort it adds.`);
    }
  } else if (!place.shade_description) {
    reasons.push("Shade hasn’t been checked yet, so it doesn’t affect this estimate.");
  } else {
    reasons.push(`The source mentions this shade detail: ${place.shade_description}.`);
  }

  const exposure = place.sun_exposure?.toLowerCase() ?? "";
  if (warmConditions && exposure) {
    if (/full sun|direct sun|high exposure|fully exposed/.test(exposure)) {
      score -= 5;
      reasons.push(`The listed sun exposure (“${place.sun_exposure}”) may make warm weather feel tougher.`);
    } else if (/partial shade|mostly shaded|low exposure|shaded/.test(exposure)) {
      score += 5;
      reasons.push(`The listed sun exposure (“${place.sun_exposure}”) may help make a warm day more comfortable.`);
    } else {
      reasons.push(`The source mentions sun exposure (“${place.sun_exposure}”), but I can’t tell how much comfort it adds.`);
    }
  } else if (!place.sun_exposure) {
    reasons.push("Sun exposure hasn’t been checked yet, so it doesn’t affect this estimate.");
  } else {
    reasons.push(`The source mentions this sun exposure: ${place.sun_exposure}.`);
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
        ? "Looks like a comfy pick"
        : estimate.score >= 50
          ? "Could be a nice fit"
          : "Weather may feel tough";
  });

  return estimates;
}

function recordedValue(value: boolean | null) {
  if (value === null) return "Not checked yet";
  return value ? "Reported online" : "Not listed by the source";
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
          Maayong pag-abot!
        </h1>
        <p className="text-base leading-7 text-muted-foreground">
          <span className="block font-medium text-foreground">That means “Welcome!” in Hiligaynon. I’m your friendly Ilonggo guide to a little fresh air.</span>
          <span className="mt-1 block">Let’s find you a spot to slow down, feel the breeze, or enjoy a quiet moment. Pick a forecast hour and I’ll help you compare.</span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>How’s the weather looking?</CardTitle>
          <CardDescription>
            A city forecast from{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
            >
              Open-Meteo
            </a>
            . Each plaza can feel a little different, so think of this as a helpful heads-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isForecastLoading ? (
            <p className="text-sm text-muted-foreground" role="status">
              Taking a look at the forecast…
            </p>
          ) : hasForecastError ? (
            <p className="text-sm text-destructive" role="alert">
              Oops, I can’t get the weather right now. Check your connection and refresh to try again.
            </p>
          ) : selectedForecast ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="forecast-hour">
                  When are you thinking of heading out?
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
              I can’t see any upcoming forecast hours right now. Please check back in a little while.
            </p>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="spots-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="spots-heading" className="text-xl font-semibold">Let’s find a spot to unwind</h2>
          <p className="text-sm text-muted-foreground">
            Here’s what I found online. These details haven’t been checked on site recently, so I’ll mark anything I can’t confirm as not checked.
          </p>
        </div>

        {canRankSpots ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>
              I match Iloilo’s forecast with the features reported for each spot. Trees, shade, and seating can help shape the estimate; details I haven’t checked won’t change it.
            </p>
            <p>
              It’s a helpful guide, not a promise of exactly what you’ll find when you get there.
              {estimatesAreTied ? " These spots are tied for now based on the details available." : " You can check each card’s source for where its details came from."}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground" role="status">
            {isForecastLoading
              ? "I’m checking the forecast. For now, here are the spots in alphabetical order."
              : "I can’t make a weather-based comparison right now, so here are the spots in alphabetical order instead."}
          </p>
        )}

        {isLoading ? (
          <Card><CardContent className="p-6">
            <p className="text-sm text-muted-foreground" role="status">Getting the spots ready for you…</p>
          </CardContent></Card>
        ) : hasError ? (
          <Card><CardContent className="p-6">
            <p className="text-sm text-destructive" role="alert">
              I can’t load the spots right now. Check your connection and give the page another try.
            </p>
          </CardContent></Card>
        ) : places.length === 0 ? (
          <Card><CardContent className="p-6">
            <p className="text-sm text-muted-foreground">I’m still gathering places to share. Please come back soon.</p>
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
                            Pick #{estimate.rank}{estimate.isTied ? " (tied)" : ""} · {estimate.label}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not compared yet</p>
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
                            <p className="font-medium">Weather around your chosen hour</p>
                          <p className="mt-1 leading-6 text-muted-foreground">
                            Feels like {displayForecastValue(selectedForecast?.apparentTemperature ?? null, "°C")}, humidity {displayForecastValue(selectedForecast?.humidity ?? null, "%")}, wind {displayForecastValue(selectedForecast?.windSpeed ?? null, " km/h")}, and rain chance {displayForecastValue(selectedForecast?.precipitationProbability ?? null, "%")}. {estimate.forecastReasons.join(" ")}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">What I found out about this spot</p>
                          <p className="mt-1 leading-6 text-muted-foreground">
                            {estimate.placeReasons.join(" ")}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                      <div className="space-y-1 rounded-lg bg-muted/60 p-3">
                        <dt className="flex items-center gap-2 font-medium"><Sun aria-hidden="true" className="size-4" />Shade</dt>
                        <dd className="text-muted-foreground">{place.shade_description || "Not checked yet"}</dd>
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
                        <dd className="text-muted-foreground">{place.sun_exposure || "Not checked yet"}</dd>
                      </div>
                    </dl>
                    <div className="mt-auto border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                      <p>Source checked {formatCheckedDate(place.verified_at)}</p>
                      <a className="mt-1 inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground" href={place.source_url} target="_blank" rel="noreferrer">
                        See where these details came from <ArrowUpRight aria-hidden="true" className="size-3.5" />
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
