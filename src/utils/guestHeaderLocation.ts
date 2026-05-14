/** Shown as the bold title in the header address row when the customer is not logged in. */
export const GUEST_HEADER_LOCATION_TITLE = "Current location";

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
  const roadLine = [addr.house_number, addr.road].filter(Boolean).join(" ").trim();
  const parts = [
    roadLine,
    addr.suburb || addr.neighbourhood,
    addr.city || addr.town || addr.village,
    addr.state,
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
  const line =
    parts.join(", ") ||
    (d.display_name ? d.display_name.split(",").slice(0, 4).join(",").trim() : "");
  return (d.display_name || line || "").trim();
}

/**
 * Browser GPS + reverse geocode for the guest header. Persists `userCoordinates` and
 * `userLocation` when a label is found (same keys as elsewhere in the app).
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
            label = (results?.[0]?.formatted_address || "").trim();
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
