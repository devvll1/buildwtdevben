"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Leaf, MapPin, Trees, Armchair, Sun } from "lucide-react";
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

      <section aria-labelledby="spots-heading" className="space-y-4">
        <div className="space-y-1">
          <h2 id="spots-heading" className="text-xl font-semibold">Outdoor spots in Iloilo City</h2>
          <p className="text-sm text-muted-foreground">
            Place details are based on the listed source and last checked date. Unverified
            features are labeled so you know what still needs confirmation.
          </p>
        </div>

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
            {places.map((place) => {
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
              return (
                <Card className="flex flex-col overflow-hidden" key={place.id}>
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <CardTitle className="text-xl">{place.name}</CardTitle>
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
                      <p>Details checked {formatCheckedDate(place.verified_at)}</p>
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
