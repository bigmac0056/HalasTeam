const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  addAutomationLog,
  getAutomationLogsByUserId
} = require("../state");

router.post("/log", authMiddleware, (req, res) => {
  const { action } = req.body;
  const userId = req.user.id;

  const newLog = addAutomationLog({
    userId,
    action
  });

  res.json(newLog);
});

router.get("/log", authMiddleware, (req, res) => {
  const userId = req.user.id;

  const logs = getAutomationLogsByUserId(userId);

  res.json(logs);
});

module.exports = router;
