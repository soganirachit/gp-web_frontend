/** Title — aligned with mobile `CitySelectionBottomSheet`. */
export const GUEST_AREA_MODAL_TITLE = "Choose a city";

/** GPS / browser denied or unavailable — prompt to enable or pick a city. */
export const GUEST_AREA_MODAL_SUBTITLE_NEED_LOCATION =
  "Turn on location or pick a city to see products and delivery options.";

/** Coordinates known but outside delivery coverage or no store serves the area. */
export const GUEST_AREA_MODAL_SUBTITLE_OUTSIDE =
  "We don't deliver to your exact location yet. Pick a city we serve to continue.";

/** @deprecated Use NEED_LOCATION or OUTSIDE for new UI. */
export const GUEST_AREA_MODAL_SUBTITLE = GUEST_AREA_MODAL_SUBTITLE_OUTSIDE;

export type GuestAreaModalVariant = "need_location" | "outside_service";

export function guestAreaSubtitleForVariant(
  variant: GuestAreaModalVariant,
): string {
  return variant === "need_location"
    ? GUEST_AREA_MODAL_SUBTITLE_NEED_LOCATION
    : GUEST_AREA_MODAL_SUBTITLE_OUTSIDE;
}

/** CustomEvent for opening the guest area modal from store pages (manual location tap). */
export const GP_OPEN_GUEST_AREA_MODAL_EVENT = "gp-open-guest-area-modal";

export type GpOpenGuestAreaModalDetail = {
  dismissible?: boolean;
  variant?: GuestAreaModalVariant;
  /** After picking a city, navigate to the address entry page (guest ordering for someone else). */
  redirectToAddressAfterPick?: boolean;
};
