/**
 * Shared Google Places Autocomplete settings aligned with store onboarding:
 * uncontrolled search input should be paired with these options in parents.
 * - India-only
 * - Explicit fields (saves Places cost / predictable shape)
 * - No narrow `types` filter — broader predictions (streets, POIs, etc.)
 *
 * Keep in sync with AdminZipCode/src/utils/googlePlacesAutocompleteConfig.ts
 */

export const ONBOARDING_STYLE_PLACES_AUTOCOMPLETE_OPTIONS: google.maps.places.AutocompleteOptions =
  {
    componentRestrictions: { country: "in" },
    fields: ["formatted_address", "geometry", "address_components", "name"],
  };

/** Bias suggestions toward the map viewport (rank closer to “near here”). */
export function attachPlacesAutocompleteToMapBounds(
  ac: google.maps.places.Autocomplete | null,
  map: google.maps.Map | null,
): void {
  const widget = ac as unknown as
    | { bindTo?: (key: string, target: google.maps.Map) => void }
    | null;
  if (!widget?.bindTo || !map) return;
  try {
    widget.bindTo("bounds", map);
  } catch {
    /* optional API */
  }
}

/** After user picks a place: move map to that location (viewport fit when available). */
export function panMapToPlaceResult(
  place: google.maps.places.PlaceResult,
  map: google.maps.Map | null,
): void {
  if (!map || !place.geometry?.location) return;
  const loc = place.geometry.location;
  const vp = place.geometry.viewport;
  if (vp) {
    map.fitBounds(vp);
  } else {
    map.panTo(loc);
    const z = map.getZoom();
    if (z == null || z < 14) map.setZoom(15);
  }
}
