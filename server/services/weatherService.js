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

async function resolveCity(lat, lon) {
  let cityFromGeo = null;

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
        timeout: 5000,
      }
    );

    const place = response?.data?.results?.[0];
    cityFromGeo = (
      place.city ||
      place.town ||
      place.village ||
      place.name ||
      null
    );
  } catch (error) {
    console.error("Ошибка reverse geocoding:", error.message);
  }

  if (cityFromGeo) return cityFromGeo;

  try {
    // Fallback: nearest known city from tariff providers
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
  try {
    const [weatherResponse, city] = await Promise.all([
      axios.get(
        "https://api.open-meteo.com/v1/forecast",
        {
          params: {
            latitude: lat,
            longitude: lon,
            current_weather: true,
            timezone: "auto",
          },
          timeout: 5000,
        }
      ),
      resolveCity(lat, lon),
    ]);

    const weather = weatherResponse.data.current_weather;

    return {
      temperature: weather.temperature,
      windspeed: weather.windspeed,
      weathercode: weather.weathercode,
      isDay: weather.is_day === 1,
      city: city || "Не определен",
    };
  } catch (error) {
    console.error("Ошибка Open-Meteo:", error.message);
    throw new Error("Ошибка при получении данных о погоде");
  }
}

module.exports = { getWeather };
