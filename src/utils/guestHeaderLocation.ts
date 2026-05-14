/** Shown as the bold title in the header address row when the customer is not logged in. */
export const GUEST_HEADER_LOCATION_TITLE = "Current location";

/** Secondary line when guest GPS/network did not return a city label. */
export const GUEST_LOCATION_UNAVAILABLE_HINT =
  "We could not detect your city. Check connection or location permissions, then tap to set your area.";

async function reverseGeocodeOsm(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({
    format: "json",
    lat: String(lat),
    lon: String(lng),
    "accept-language": "en",
  });
  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "GendaPhoolGuestHeader/1.0 (https://customerapp.mygendaphool.com)",
    },
  });
  if (!res.ok) return "";
  const d = (await res.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };
  const addr = d.address || {};
  const city = (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.state_district ||
    ""
  )
    .toString()
    .trim();
  if (city) return city;
  const line =
    (d.display_name ? d.display_name.split(",").slice(-3, -2)[0] : "") || "";
  return line.trim();
}

function pickCityFromGoogleResults(
  results: google.maps.GeocoderResult[] | undefined,
): string {
  if (!results?.length) return "";
  for (const r of results) {
    for (const c of r.address_components || []) {
      if (
        c.types.includes("locality") ||
        c.types.includes("postal_town") ||
        c.types.includes("administrative_area_level_3")
      ) {
        const n = (c.long_name || "").trim();
        if (n) return n;
      }
    }
  }
  const fa = results[0]?.formatted_address;
  if (fa) {
    const parts = fa.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return (
        parts[Math.max(0, parts.length - 3)] ||
        parts[parts.length - 2] ||
        parts[0]
      );
    }
  }
  return "";
}

/**
 * Browser GPS + reverse geocode for the guest header. Persists `userCoordinates` and
 * `userLocation` with a **city-only** label (same keys as elsewhere in the app).
 */
export function fetchGuestDeviceLocationLabel(
  signal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve("");
      return;
    }
    const finish = (s: string) => resolve(signal?.aborted ? "" : s);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (signal?.aborted) {
          finish("");
          return;
        }
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let label = "";
        try {
          if (typeof window !== "undefined" && window.google?.maps) {
            const geocoder = new google.maps.Geocoder();
            const { results } = await geocoder.geocode({ location: { lat, lng } });
            label = pickCityFromGoogleResults(results);
          }
          if (!label) {
            label = (await reverseGeocodeOsm(lat, lng)).trim();
          }
          if (!signal?.aborted && label) {
            try {
              localStorage.setItem("userCoordinates", JSON.stringify({ lat, lng }));
              localStorage.setItem("userLocation", label);
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* ignore */
        }
        finish(label);
      },
      () => finish(""),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    );
  });
}
