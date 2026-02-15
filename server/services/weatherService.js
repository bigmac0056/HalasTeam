const axios = require("axios");

async function resolveCity(lat, lon) {
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
    if (!place) return null;

    return (
      place.city ||
      place.town ||
      place.village ||
      place.name ||
      null
    );
  } catch (error) {
    console.error("Ошибка reverse geocoding:", error.message);
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
      city: city || "Не определен",
    };
  } catch (error) {
    console.error("Ошибка Open-Meteo:", error.message);
    throw new Error("Ошибка при получении данных о погоде");
  }
}

module.exports = { getWeather };
