const axios = require("axios");
const TariffService = require("./tariffService");

const CITY_LABELS = {
  Astana: "Астана",
  Almaty: "Алматы",
  Shymkent: "Шымкент",
  Pavlodar: "Павлодар",
  Karaganda: "Караганда",
  Oskemen: "Өскемен",
  Kostanay: "Костанай",
  Aktau: "Актау",
  Atyrau: "Атырау",
  Aktobe: "Актобе",
};

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toNumberOr = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const mapOpenWeatherToMeteoCode = (weatherId, isDay) => {
  const code = Number(weatherId);
  if (!Number.isFinite(code)) return isDay ? 2 : 0;

  if (code >= 200 && code < 300) return 95;
  if (code >= 300 && code < 400) return 51;
  if (code === 500 || code === 501) return 63;
  if (code >= 502 && code <= 504) return 65;
  if (code === 511) return 56;
  if (code >= 520 && code <= 531) return 81;
  if (code === 600) return 71;
  if (code === 601) return 73;
  if (code >= 602 && code <= 622) return 75;
  if (code >= 700 && code < 800) return 45;
  if (code === 800) return isDay ? 0 : 1;
  if (code === 801) return isDay ? 1 : 2;
  if (code === 802) return 2;
  if (code === 803 || code === 804) return 3;
  return isDay ? 2 : 0;
};

async function getOpenMeteoWeather(lat, lon) {
  const weatherResponse = await axios.get(
    "https://api.open-meteo.com/v1/forecast",
    {
      params: {
        latitude: lat,
        longitude: lon,
        current: "temperature_2m,wind_speed_10m,weather_code,is_day",
        timezone: "auto",
      },
      timeout: 6000,
    }
  );

  const current = weatherResponse?.data?.current || weatherResponse?.data?.current_weather;
  if (!current) {
    throw new Error("Open-Meteo returned empty current weather");
  }

  const temperature = toNumberOr(current.temperature_2m ?? current.temperature, NaN);
  if (!Number.isFinite(temperature)) {
    throw new Error("Open-Meteo missing temperature");
  }

  return {
    temperature,
    windspeed: toNumberOr(current.wind_speed_10m ?? current.windspeed, 0),
    weathercode: toNumberOr(current.weather_code ?? current.weathercode, 2),
    isDay: Number(current.is_day) === 1,
    source: "open-meteo",
  };
}

async function getOpenWeatherMapWeather(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not set");
  }

  const response = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
    params: {
      lat,
      lon,
      appid: apiKey,
      units: "metric",
      lang: "ru",
    },
    timeout: 6000,
  });

  const data = response?.data;
  const temperature = toNumberOr(data?.main?.temp, NaN);
  if (!Number.isFinite(temperature)) {
    throw new Error("OpenWeatherMap missing temperature");
  }

  const now = toNumberOr(data?.dt, Math.floor(Date.now() / 1000));
  const sunrise = toNumberOr(data?.sys?.sunrise, now - 1);
  const sunset = toNumberOr(data?.sys?.sunset, now + 1);
  const isDay = now >= sunrise && now < sunset;
  const weatherId = data?.weather?.[0]?.id;

  return {
    temperature,
    windspeed: toNumberOr(data?.wind?.speed, 0),
    weathercode: mapOpenWeatherToMeteoCode(weatherId, isDay),
    isDay,
    source: "openweathermap",
  };
}

async function resolveCity(lat, lon) {
  const fallbackCity = resolveNearestCityFromTariffs(lat, lon);

  try {
    const response = await axios.get(
      "https://geocoding-api.open-meteo.com/v1/reverse",
      {
        params: {
          latitude: lat,
          longitude: lon,
          language: "ru",
          format: "json",
          count: 1,
        },
        timeout: 2500,
      }
    );

    const place = response?.data?.results?.[0];
    const cityFromGeo = (
      place?.city ||
      place?.town ||
      place?.village ||
      place?.name ||
      null
    );

    return cityFromGeo || fallbackCity;
  } catch (error) {
    console.error("Ошибка reverse geocoding:", error.message);
    return fallbackCity;
  }
}

function resolveNearestCityFromTariffs(lat, lon) {
  try {
    const providers = TariffService.getProviders() || [];
    if (providers.length === 0) return null;

    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;

    let closest = null;
    let minDistance = Infinity;

    for (const provider of providers) {
      const pLat = provider?.coordinates?.lat;
      const pLon = provider?.coordinates?.lon;
      if (!Number.isFinite(pLat) || !Number.isFinite(pLon)) continue;

      const distance = haversineKm(latNum, lonNum, pLat, pLon);
      if (distance < minDistance) {
        minDistance = distance;
        closest = provider.city || provider.region;
      }
    }

    if (!closest) return null;
    return CITY_LABELS[closest] || closest;
  } catch (error) {
    console.error("Ошибка fallback определения города:", error.message);
    return null;
  }
}

async function getWeather(lat, lon) {
  const cityHint = resolveNearestCityFromTariffs(lat, lon) || "Астана";
  const cityPromise = resolveCity(lat, lon).catch(() => cityHint);
  const nowIso = new Date().toISOString();
  const hour = new Date().getHours();
  const fallbackIsDay = hour >= 7 && hour < 20;

  const fallback = {
    temperature: 20,
    windspeed: 0,
    weathercode: fallbackIsDay ? 2 : 0,
    isDay: fallbackIsDay,
    city: cityHint,
    source: "fallback",
    isFallback: true,
    fetchedAt: nowIso,
  };

  try {
    const meteo = await getOpenMeteoWeather(lat, lon);
    const city = await cityPromise;

    return {
      temperature: meteo.temperature,
      windspeed: meteo.windspeed,
      weathercode: meteo.weathercode,
      isDay: meteo.isDay,
      city: city || cityHint || "Не определен",
      source: meteo.source,
      isFallback: false,
      fetchedAt: nowIso,
    };
  } catch (meteoError) {
    console.error("Ошибка Open-Meteo:", meteoError.message);
  }

  try {
    const openWeather = await getOpenWeatherMapWeather(lat, lon);
    const city = await cityPromise;
    return {
      temperature: openWeather.temperature,
      windspeed: openWeather.windspeed,
      weathercode: openWeather.weathercode,
      isDay: openWeather.isDay,
      city: city || cityHint || "Не определен",
      source: openWeather.source,
      isFallback: false,
      fetchedAt: nowIso,
    };
  } catch (openWeatherError) {
    console.error("Ошибка OpenWeatherMap:", openWeatherError.message);
  }

  return fallback;
}

module.exports = { getWeather };
