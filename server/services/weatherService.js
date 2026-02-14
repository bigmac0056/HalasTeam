const axios = require("axios");

async function getWeather(lat, lon) {
  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );

    const weather = response.data.current_weather;

    return {
      temperature: weather.temperature,
      windspeed: weather.windspeed,
      weathercode: weather.weathercode,
    };
  } catch (error) {
    console.error("Ошибка Open-Meteo:", error.message);
    throw new Error("Ошибка при получении данных о погоде");
  }
}

module.exports = { getWeather };
