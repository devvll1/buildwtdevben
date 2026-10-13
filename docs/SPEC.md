# Spec: Iloilo Outdoor Comfort Finder

## Problem
Visitors unfamiliar with Iloilo City may have trouble choosing an outdoor place to relax because maps and general forecasts do not show how weather and place features combine. The problem is based on the project owner's experience and still needs validation with actual visitors.

## Solution
A no-login, single-page app ranks three to five documented outdoor spots for a selected forecast hour. It combines an hourly area-level forecast with recorded place features and explains the basis for each outdoor comfort estimate.

## The user
Visitors unfamiliar with Iloilo City who want to choose an outdoor place to relax or spend their free time.

## Brand voice
The finder speaks like a hospitable Ilonggo local guide welcoming visitors. Use warm, plain English that people unfamiliar with Iloilo can follow, with occasional Hiligaynon such as “Maayong pag-abot!” followed by its English meaning. Keep advice helpful and honest; do not use unexplained local slang, stereotypes, or claims that the guide has personally visited a place.

## Visual direction
Use a calm, nature-inspired editorial style that feels welcoming to visitors. The main palette is warm cream (`#F8F6EF`), forest green (`#315E49`), sage (`#DCE9D9`), and sparing sunset gold (`#E6B86A`). Use a readable serif for headings and a clean sans serif for body text, with generous whitespace, rounded cards, subtle shadows, and simple outline icons. Authentic Iloilo photography should lead the visual experience, with visible attribution. Design mobile-first with touch-friendly controls and clear focus states. Keep cost details out until dependable cost data exists.

The place browser may offer simple single-select discovery filters for a short break, shade, seating, and greenery. These filters must only match features explicitly documented for a place; unknown information is not a positive or negative match. Show a clear reset option if a filter produces no results.

## User stories
1. As a visitor, I want to choose an upcoming hour so that I can compare places for when I plan to go.
2. As a visitor, I want to see a short list of outdoor spots so that I can discover options without searching across several services.
3. As a visitor, I want spots ranked using forecast conditions and documented place features so that I can compare their estimated outdoor comfort.
4. As a visitor, I want to see why a spot was recommended so that I can judge whether the estimate fits my needs.
5. As a visitor, I want to see which details come from the forecast and which are documented place features so that I understand the basis and limits of the estimate.
6. As a visitor, I want to see the forecast time and source so that I can tell how current the forecast information is.
7. As a visitor, I want to open a spot's map location so that I can continue planning my visit.

## Screens
- **Find a place to relax:** A single page where visitors choose an upcoming forecast hour and see three to five outdoor spots ranked by a simple, rule-based outdoor comfort estimate. Each spot shows its name, documented features such as shade, trees, and seating, relevant forecast conditions, the reason for its ranking, forecast source and time, and a map link. The page clearly labels forecast data as area-level estimates, not measurements at each spot.

## Data
- **`places` Supabase table:** Three to five Iloilo City outdoor spots. Columns: `id` (UUID primary key), `slug` (unique text identifier), `name` (text), `latitude` and `longitude` (coordinates), `description` (short text), `shade_description` (text), `has_trees` and `has_seating` (booleans), `sun_exposure` (text), `source_url` (text), and `verified_at` (date). The team selects and documents the spots before the demo.
- Place details may be summarized from published online sources for the prototype. The app must identify these as source-reported rather than recently checked on-site, show the linked source and source-check date, and leave unsupported features unverified. Historical reports may not reflect current conditions.
- **Access and security:** Row Level Security (RLS) is enabled on `places`. Anonymous visitors may read place rows. No public insert, update, or delete access is allowed. Spot data is seeded and maintained by the team through the Supabase dashboard or SQL, not by app visitors.
- **Hourly forecast (fetched from Open-Meteo, not stored):** Forecast time, apparent temperature, humidity, wind speed, and precipitation probability for Iloilo City. The app uses the selected hour's forecast together with documented place features to produce a simple, explainable ranking. Forecast results are not retained.
- **User data:** None. The MVP has no accounts, visitor reports, or saved personal preferences.

## Login
No login. Visitors can use the app without an account.

## Done for the demo
- The live URL opens the place finder without requiring an account.
- The live app reads place rows from the `places` Supabase table, with RLS enabled and public read-only access.
- The visitor can choose an upcoming forecast hour.
- Three to five documented outdoor spots appear, with their features and map locations.
- The app retrieves hourly Open-Meteo forecast data and displays the forecast source and time.
- Spots are ranked using a simple rule-based outdoor comfort estimate that considers forecast conditions and documented place features.
- Each recommendation explains its basis and distinguishes forecast information from documented place features.
- The interface makes clear that estimates do not guarantee exact conditions at an individual spot.

## Out of scope
- Automated internet scraping of spot information.
- Local weather sensors or measurements at individual spots.
- Visitor-submitted reports, accounts, and saved personal preferences.
- More locations than the initial three to five documented spots.
- Advanced prediction methods beyond a simple rule-based ranking.
- Claims about exact spot conditions, current shade or seating availability, or crowd levels without recent verification.
