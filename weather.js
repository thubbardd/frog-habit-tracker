// weather.js — Open-Meteo weather integration for Groyper Tracker
// No API key required. Uses browser geolocation with IP-based fallback.

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const IP_GEO_API = 'https://ipapi.co/json/';
const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

let refreshTimer = null;

/**
 * Map a WMO weather code to a theme string.
 * @param {number} weatherCode - WMO 4677 weather code
 * @returns {string} Theme identifier
 */
export function getWeatherTheme(weatherCode) {
  if (weatherCode === 0 || weatherCode === 1) return 'sunny';
  if (weatherCode === 2 || weatherCode === 3) return 'overcast';
  if (weatherCode === 45 || weatherCode === 48) return 'foggy';
  if (weatherCode >= 51 && weatherCode <= 67) return 'rainy';
  if (weatherCode >= 71 && weatherCode <= 86) return 'snowy';
  if (weatherCode >= 95 && weatherCode <= 99) return 'stormy';
  return 'overcast';
}

/**
 * Get an emoji representing the given weather theme.
 * @param {string} theme - One of the theme strings from getWeatherTheme
 * @returns {string} Emoji character
 */
export function getWeatherEmoji(theme) {
  const emojis = {
    sunny: '☀️',
    overcast: '☁️',
    foggy: '🌫️',
    rainy: '🌧️',
    snowy: '❄️',
    stormy: '⛈️',
  };
  return emojis[theme] || '☁️';
}

/**
 * Fetch current weather data from Open-Meteo for a given position.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{theme: string, emoji: string, temperature: number, weatherCode: number, locationSource: string}>}
 */
async function fetchWeather(latitude, longitude, locationSource) {
  const url = `${API_BASE}?latitude=${latitude}&longitude=${longitude}&current=weather_code,temperature_2m&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API responded with status ${response.status}`);
  }

  const data = await response.json();
  const weatherCode = data.current.weather_code;
  const temperature = data.current.temperature_2m;
  const theme = getWeatherTheme(weatherCode);
  const emoji = getWeatherEmoji(theme);

  return { theme, emoji, temperature, weatherCode, locationSource };
}

/**
 * Build the fallback weather object used when all location methods fail.
 * @returns {{theme: string, emoji: string, temperature: number, weatherCode: number, locationSource: string}}
 */
function fallbackWeather() {
  return {
    theme: 'overcast',
    emoji: getWeatherEmoji('overcast'),
    temperature: null,
    weatherCode: -1,
    locationSource: 'fallback',
  };
}

/**
 * Request the user's position via the browser Geolocation API.
 * @returns {Promise<GeolocationPosition>}
 */
function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation API not available'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 0, // always request fresh position
    });
  });
}

/**
 * Get approximate location via IP geolocation as a fallback.
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
async function getIPPosition() {
  const response = await fetch(IP_GEO_API);
  if (!response.ok) throw new Error('IP geolocation failed');
  const data = await response.json();
  if (!data.latitude || !data.longitude) throw new Error('IP geolocation returned no coordinates');
  return { latitude: data.latitude, longitude: data.longitude };
}

/**
 * Perform a full refresh cycle with automatic fallback:
 *   1. Try browser GPS/Geolocation
 *   2. Fall back to IP-based geolocation
 *   3. Fall back to static overcast theme
 */
async function refresh(onWeatherUpdate) {
  // --- Attempt 1: Browser Geolocation ---
  try {
    const position = await getBrowserPosition();
    const { latitude, longitude } = position.coords;
    const weather = await fetchWeather(latitude, longitude, 'gps');
    console.log('[weather] GPS location success:', latitude, longitude, '→', weather.theme);
    onWeatherUpdate(weather);
    return;
  } catch (gpsError) {
    console.warn('[weather] GPS geolocation failed:', gpsError.message);
  }

  // --- Attempt 2: IP-based Geolocation ---
  try {
    const { latitude, longitude } = await getIPPosition();
    const weather = await fetchWeather(latitude, longitude, 'ip');
    console.log('[weather] IP location success:', latitude, longitude, '→', weather.theme);
    onWeatherUpdate(weather);
    return;
  } catch (ipError) {
    console.warn('[weather] IP geolocation also failed:', ipError.message);
  }

  // --- Attempt 3: Fallback ---
  console.warn('[weather] All location methods failed, using overcast fallback.');
  onWeatherUpdate(fallbackWeather());
}

/**
 * Initialise weather tracking.
 *
 * Immediately tries GPS → IP → fallback to get location, fetches weather,
 * and calls `onWeatherUpdate`. Refreshes every 30 minutes.
 *
 * @param {function} onWeatherUpdate - callback receiving weather data object
 * @returns {{ stop: function }} handle to cancel the refresh timer
 */
export function initWeather(onWeatherUpdate) {
  // Clear any previous timer
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  // Initial fetch
  refresh(onWeatherUpdate);

  // Schedule recurring refreshes
  refreshTimer = setInterval(() => refresh(onWeatherUpdate), REFRESH_MS);

  return {
    stop() {
      if (refreshTimer !== null) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    },
  };
}
