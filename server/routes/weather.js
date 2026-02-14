const express = require("express");
const router = express.Router();
const { getWeather } = require("../services/weatherService");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: "Координаты обязательны. Укажите lat и lon в query параметрах",
      });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || isNaN(lonNum)) {
      return res.status(400).json({ error: "Неверный формат координат" });
    }

    const weather = await getWeather(latNum, lonNum);

    res.json(weather);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

module.exports = router;
