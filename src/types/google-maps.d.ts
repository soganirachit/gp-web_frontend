declare global {
  interface Window {
    google: {
      maps?: any;
    } | undefined;
    __GOOGLE_MAPS_ANALYTICS__?: boolean;
    __GOOGLE_MAPS_EXPERIMENTS__?: boolean;
    locationWatchId?: number;
  }
}

export {}; 