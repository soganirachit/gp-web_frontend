import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  handleGpsWatchSample,
  refreshLocationForChannel,
} from "../../services/locationSession.service";
import { channelFromPathname } from "../../utils/locationSession";
/**
 * One session pin for Home / Store / Daily.
 * Auto: GPS (+ saved-address rank). Manual: frozen for this visit.
 * Reopen / hard refresh: GPS if on, else default (logged in) or last city (guest).
 * Re-checks radius vs zone on every Store ↔ Daily (and Home) entry.
 * Re-resolves Auto when GPS moves ~1 km.
 */
export function LocationSessionHost() {
  const { pathname } = useLocation();
  const { isLoggedIn } = useAuth();
  const lastChannelRef = useRef<string>("");
  const inFlightRef = useRef(false);
  const pendingRef = useRef<ReturnType<typeof channelFromPathname>>(null);
  const loggedInRef = useRef(isLoggedIn);
  loggedInRef.current = isLoggedIn;

  useEffect(() => {
    const channel = channelFromPathname(pathname);
    if (!channel) return;
    const key = `${channel}|${isLoggedIn ? "in" : "out"}`;
    if (lastChannelRef.current === key) return;
    lastChannelRef.current = key;

    const run = (ch: NonNullable<ReturnType<typeof channelFromPathname>>) => {
      inFlightRef.current = true;
      void refreshLocationForChannel(ch).finally(() => {
        inFlightRef.current = false;
        const next = pendingRef.current;
        pendingRef.current = null;
        if (!next || next === ch) return;
        const nextKey = `${next}|${loggedInRef.current ? "in" : "out"}`;
        lastChannelRef.current = nextKey;
        run(next);
      });
    };

    if (inFlightRef.current) {
      pendingRef.current = channel;
      return;
    }
    run(channel);
  }, [pathname, isLoggedIn]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        handleGpsWatchSample(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        /* denied / timeout — Auto falls back on the next channel refresh */
      },
      {
        enableHighAccuracy: false,
        timeout: 20_000,
        maximumAge: 30_000,
      },
    );
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return null;
}
