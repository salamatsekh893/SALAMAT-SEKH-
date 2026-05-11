
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  if (!GOOGLE_MAPS_API_KEY) return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  } catch (err) {
    console.error('Geocoding error:', err);
    return `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
}
