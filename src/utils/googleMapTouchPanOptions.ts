/** One-finger pan on mobile web (default cooperative needs two fingers). */
export const GOOGLE_MAP_TOUCH_PAN_OPTIONS: google.maps.MapOptions = {
  draggable: true,
  gestureHandling: "greedy",
  scrollwheel: true,
};
