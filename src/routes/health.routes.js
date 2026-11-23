const { Router } = require("express");
const db = require("../config/db");

const router = Router();

router.get("/up", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS server_time");
    res.status(200).json({
      status: "OK",
      service: "auth-rbac-api",
      database: "conectada",
      db_time: result.rows[0].server_time,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "desconectada",
      message: error.message,
    });
  }
});

router.get("/", async (req, res) => {
  try {
    res.status(200).json({
      status: "OK",
      service: "AUTH-SERVICE-API",
      message: "Api para aprendizaje hecha con node.js",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "desconectada",
      message: error.message,
    });
  }
});

module.exports = router;
