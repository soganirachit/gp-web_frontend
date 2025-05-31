# Google Maps API Setup Guide

This guide will help you configure the Google Maps API correctly for the GendaPhool application.

## Current Issues Fixed

We've addressed several issues with the Google Maps implementation:

1. **InvalidKey Error**: Fixed by providing a proper API key configuration
2. **Missing AdvancedMarkerElement**: Updated code to fallback to regular Marker when advanced APIs aren't available
3. **Deprecated API Warnings**: Modified code to handle both newer and older API versions

## How to Set Up Google Maps API

### 1. Get a Valid Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. **Enable these specific APIs**:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to only the APIs you need
6. For development, you can set domain restrictions to include localhost

### 2. Configure Your Application

1. Open your `.env` file located at `Frontend/GendaPhool-Main/frontend/.env`
2. The API key is already configured with: `VITE_GOOGLE_MAPS_API_KEY=AIzaSyDS6P1pfIv5BHadYwVL7UJK6d69v6NDDn8`
3. If this key doesn't work, replace it with your own active key
4. **Important**: Make sure to restart your development server after changing the key

### 3. How We Fixed the Advanced Marker Issue

The error `Cannot destructure property 'AdvancedMarkerElement' of 'window.google.maps.marker' as it is undefined` occurred because:

1. The AdvancedMarkerElement API is not automatically loaded with the basic Maps API
2. It requires an additional library to be loaded
3. Our solution:
   - We now use regular Markers instead of AdvancedMarkerElement
   - This is more compatible across browsers and Google Maps versions
   - The user experience remains the same

### 4. Testing Your Setup

1. Clear your browser cache
2. Hard reload the page (Ctrl+Shift+R or Cmd+Shift+R)
3. Open the browser console (F12) and check for errors
4. If you still see errors about invalid keys:
   - Try using an incognito/private browser window
   - Double-check that your API key is enabled for all required services
   - Verify that billing is enabled on your Google Cloud account

## Troubleshooting

### Map Not Displaying

If the map still doesn't appear:

1. Check the browser console for specific errors
2. Verify your API key is properly formatted in the .env file
3. Make sure you've enabled billing on your Google Cloud Platform account
4. Try accessing the map from a different browser

### Other Common Issues

- **"ReferenceError: google is not defined"**: This happens when the Google Maps script fails to load. Check network tab for script loading errors.
- **"This API project is not authorized to use this API"**: Your API key doesn't have the necessary API enabled.
- **Billing required errors**: Google Maps Platform requires a billing account, even though you get $200 free credit monthly.

## Need More Help?

If you continue experiencing issues:

1. Check the [Google Maps JavaScript API documentation](https://developers.google.com/maps/documentation/javascript/overview)
2. Review the [Places API documentation](https://developers.google.com/maps/documentation/places/web-service/overview) for autocomplete functionality
3. Look at the [Google Maps React wrapper documentation](https://react-google-maps-api-docs.netlify.app/) for React-specific implementation details

For any persistent issues, please open a ticket in the project management system with screenshots of the console errors. 