"use client";

import { useEffect, useState } from "react";
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
};

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
          .select("id, name")
          .order("name");

        if (error) throw error;
        if (isCurrent) setPlaces(data ?? []);
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 sm:py-20">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          Iloilo Outdoor Comfort Finder
        </span>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find a place to relax
        </h1>
        <p className="text-base text-muted-foreground">
          We’re connecting the Iloilo City place catalog. The next step will add
          details to help you compare these spots.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Outdoor spots in Iloilo City</CardTitle>
          <CardDescription>
            Place names are loaded from the public read-only catalog.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground" role="status">
              Loading places…
            </p>
          ) : hasError ? (
            <p className="text-sm text-destructive" role="alert">
              We couldn’t load places. Check the Supabase connection and read
              access, then refresh the page.
            </p>
          ) : places.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No places are listed yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {places.map((place) => (
                <li className="py-3 first:pt-0 last:pb-0" key={place.id}>
                  <span className="font-medium">{place.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
