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
  place_type: string | null;
  shade_description: string | null;
  has_trees: boolean | null;
  has_seating: boolean | null;
  sun_exposure: string | null;
  nearby_food_description: string | null;
  commute_cost_description: string | null;
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

type PlaceFilter = "all" | "shade" | "seating" | "greenery" | "nearby-food";

const placePhotos: Record<string, { src: string; credit: string; url: string }> = {
  esplanade: {
    src: "/images/iloilo-esplanade.jpg",
    credit: "Photo: Johngaje92 / Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Iloilo_River_Esplanade_I.jpg",
  },
  jaro: {
    src: "/images/jaro-plaza.jpg",
    credit: "Photo: Patrickroque01 / Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Jaro_Plaza_(Jaro,_Iloilo_City;_04-04-2024).jpg",
  },
  molo: {
    src: "/images/molo-plaza.jpg",
    credit: "Photo: Patrickroque01 / Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Molo_Church,_Molo_Plaza,_Molo_Masion_back_drone_wide_(Molo,_Iloilo_City;_01-24-2026).jpg",
  },
  libertad: {
    src: "/images/plaza-libertad.jpg",
    credit: "Photo: Alvin Casitas / Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:Center_of_Plaza_Libertad_with_a_statue_of_Jos%C3%A9_Rizal_-_2024.jpg",
  },
};

const esplanadePhoto = {
  src: "/images/iloilo-esplanade.jpg",
  url: "https://commons.wikimedia.org/wiki/File:Iloilo_River_Esplanade_I.jpg",
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
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>("all");

  useEffect(() => {
    let isCurrent = true;

    async function loadPlaces() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("places")
          .select(
            "id, name, latitude, longitude, description, place_type, shade_description, has_trees, has_seating, sun_exposure, nearby_food_description, commute_cost_description, source_url, verified_at",
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
  const filteredPlaces = displayedPlaces.filter((place) => {
    if (placeFilter === "all") return true;
    if (placeFilter === "seating") return place.has_seating === true;
    if (placeFilter === "greenery") return place.has_trees === true;
    if (placeFilter === "nearby-food") return Boolean(place.nearby_food_description?.trim());
    const shade = `${place.shade_description ?? ""} ${place.sun_exposure ?? ""}`.toLowerCase();
    return /shade|shaded|covered|tree cover/.test(shade) && !/no shade|little shade|limited shade|full sun|direct sun|unshaded/.test(shade);
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-6 sm:px-7 sm:py-10 lg:gap-14">
      <header className="grid items-center gap-7 overflow-hidden rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-sm sm:p-9 lg:grid-cols-[1.05fr_0.95fr] lg:p-11">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-secondary px-3 py-1.5 text-xs font-medium text-primary">
            <Leaf aria-hidden="true" className="size-3.5" /> Chillo-Ilo · Iloilo City
          </span>
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Maayong pag-abot! <span className="normal-case tracking-normal text-muted-foreground">Welcome!</span></p>
            <h1 className="max-w-xl text-4xl leading-[1.08] text-foreground sm:text-5xl lg:text-[3.5rem]">
              Find your little pocket of <span className="text-primary">calm.</span>
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              New around Iloilo? I’d be happy to help you find a spot to slow down, feel the breeze, or enjoy a quiet moment.
            </p>
          </div>
          <a href="#places" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Explore places <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <figure className="relative min-h-64 overflow-hidden rounded-[1.25rem] bg-secondary sm:min-h-80 lg:min-h-[22rem]">
          <img src={esplanadePhoto.src} alt="A riverside view along Iloilo River Esplanade" className="absolute inset-0 size-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17271f]/70 via-transparent to-transparent" />
          <figcaption className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white sm:inset-x-5 sm:bottom-5">
            <span className="font-editorial text-2xl">A slower side of Iloilo</span>
            <span className="flex flex-wrap justify-end gap-x-1 rounded-full bg-black/35 px-3 py-1.5 text-[10px] backdrop-blur-sm">
              <a className="underline underline-offset-2" href={esplanadePhoto.url} target="_blank" rel="noreferrer">Photo: Johngaje92</a>
              <span>· cropped ·</span>
              <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
            </span>
          </figcaption>
        </figure>
      </header>

      <Card className="rounded-[1.5rem] border-border/80 shadow-sm">
        <CardHeader className="p-5 pb-4 sm:p-7 sm:pb-4">
          <CardTitle className="text-2xl">A little forecast check</CardTitle>
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
        <CardContent className="space-y-5 px-5 pb-5 sm:px-7 sm:pb-7">
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
                    className="h-12 min-w-56 rounded-xl border border-input bg-background px-4 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <div className="space-y-1 rounded-xl bg-secondary/70 p-3.5">
                  <dt className="flex items-center gap-2 text-sm font-medium"><Thermometer aria-hidden="true" className="size-4" />Feels like</dt>
                  <dd className="text-lg font-semibold">{displayForecastValue(selectedForecast.apparentTemperature, "°C")}</dd>
                </div>
                <div className="space-y-1 rounded-xl bg-secondary/70 p-3.5">
                  <dt className="flex items-center gap-2 text-sm font-medium"><Droplets aria-hidden="true" className="size-4" />Humidity</dt>
                  <dd className="text-lg font-semibold">{displayForecastValue(selectedForecast.humidity, "%")}</dd>
                </div>
                <div className="space-y-1 rounded-xl bg-secondary/70 p-3.5">
                  <dt className="flex items-center gap-2 text-sm font-medium"><Wind aria-hidden="true" className="size-4" />Wind</dt>
                  <dd className="text-lg font-semibold">{displayForecastValue(selectedForecast.windSpeed, " km/h")}</dd>
                </div>
                <div className="space-y-1 rounded-xl bg-secondary/70 p-3.5">
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

      <section id="places" aria-labelledby="spots-heading" className="space-y-5 scroll-mt-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your Iloilo guide</p>
          <h2 id="spots-heading" className="text-3xl text-foreground sm:text-4xl">Where would you like to unwind?</h2>
          <p className="text-sm text-muted-foreground">
            Here are a few places to start. Details come from linked sources and may need a fresh on-site check.
          </p>
        </div>

        <div className="space-y-3 rounded-[1.25rem] border border-border/80 bg-card p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
          <div>
            <p className="text-sm font-semibold">What sounds good?</p>
            <p className="mt-1 text-xs text-muted-foreground">I’ll only filter by features that are listed for a place.</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:pb-0" role="group" aria-label="Filter places by preference">
            {([
              ["all", "Any kind of break"],
              ["shade", "Some shade"],
              ["seating", "A place to sit"],
              ["greenery", "Greenery"],
              ["nearby-food", "Nearby food"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={placeFilter === value}
                onClick={() => setPlaceFilter(value)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${placeFilter === value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-secondary/60"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {canRankSpots ? (
          <div className="space-y-2 rounded-2xl border border-primary/10 bg-secondary/70 p-4 text-sm text-foreground/80">
            <p>
              I match Iloilo’s forecast with the features reported for each spot. Trees, shade, and seating can help shape the estimate; details I haven’t checked won’t change it.
            </p>
            <p>
              It’s a helpful guide, not a promise of exactly what you’ll find when you get there.
              {estimatesAreTied ? " These spots are tied for now based on the details available." : " You can check each card’s source for where its details came from."}
            </p>
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm" role="status">
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
        ) : filteredPlaces.length === 0 ? (
          <Card className="rounded-[1.5rem] border-dashed shadow-none">
            <CardContent className="flex flex-col items-start gap-3 p-6 sm:p-8">
              <div className="rounded-full bg-secondary p-3 text-primary"><Leaf aria-hidden="true" className="size-5" /></div>
              <div>
                <h3 className="text-xl">I don’t have a listed match for that just yet.</h3>
                <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">Some place details are still unverified, so I’m not guessing. Try all places or check back as more information is added.</p>
              </div>
              <button type="button" onClick={() => setPlaceFilter("all")} className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Show all places</button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredPlaces.map((place) => {
              const estimate = comfortEstimates.find((item) => item.place.id === place.id);
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
              const normalizedName = place.name.toLowerCase();
              const photoKey = normalizedName.includes("esplanade")
                ? "esplanade"
                : normalizedName.includes("jaro")
                  ? "jaro"
                  : normalizedName.includes("molo")
                    ? "molo"
                    : normalizedName.includes("libertad")
                      ? "libertad"
                      : null;
              const photo = photoKey ? placePhotos[photoKey] : null;
              return (
                <Card className="flex flex-col overflow-hidden rounded-[1.5rem] border-border/80 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md" key={place.id}>
                  {photo ? (
                    <figure className="relative aspect-[16/9] overflow-hidden bg-secondary">
                      <img src={photo.src} alt={`${place.name} in Iloilo City`} className="size-full object-cover transition duration-500 hover:scale-[1.02]" loading="lazy" />
                      <figcaption className="absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1.5 text-[10px] text-white backdrop-blur-sm">
                        <a href={photo.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{photo.credit}</a>
                        <span>· cropped ·</span>
                        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline underline-offset-2">CC BY-SA 4.0</a>
                      </figcaption>
                    </figure>
                  ) : null}
                  <CardHeader className="gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
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
                    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                      <div className="rounded-lg border border-border/70 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Place type</dt>
                        <dd className="mt-1">{place.place_type || "Not verified"}</dd>
                      </div>
                      <div className="rounded-lg border border-border/70 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Nearby food</dt>
                        <dd className="mt-1">{place.nearby_food_description || "Not verified"}</dd>
                      </div>
                      <div className="rounded-lg border border-border/70 px-3 py-2.5">
                        <dt className="text-xs font-medium text-muted-foreground">Commute cost</dt>
                        <dd className="mt-1">{place.commute_cost_description || "Not verified"}</dd>
                      </div>
                    </dl>
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
                      <div className="space-y-1 rounded-xl bg-secondary/60 p-3.5">
                        <dt className="flex items-center gap-2 font-medium"><Sun aria-hidden="true" className="size-4" />Shade</dt>
                        <dd className="text-muted-foreground">{place.shade_description || "Not checked yet"}</dd>
                      </div>
                      <div className="space-y-1 rounded-xl bg-secondary/60 p-3.5">
                        <dt className="flex items-center gap-2 font-medium"><Trees aria-hidden="true" className="size-4" />Trees</dt>
                        <dd className="text-muted-foreground">{recordedValue(place.has_trees)}</dd>
                      </div>
                      <div className="space-y-1 rounded-xl bg-secondary/60 p-3.5">
                        <dt className="flex items-center gap-2 font-medium"><Armchair aria-hidden="true" className="size-4" />Seating</dt>
                        <dd className="text-muted-foreground">{recordedValue(place.has_seating)}</dd>
                      </div>
                      <div className="space-y-1 rounded-xl bg-secondary/60 p-3.5">
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
