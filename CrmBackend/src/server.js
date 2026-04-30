//#region IMPORTS
const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const expressWs = require("express-ws");

// ✅ FIXED PATHS
const db = require("../models/index");
const { mongoLogger } = require("../services/logger.services");
const { APICODES } = require("../constant/constants");
//#endregion

//#region CONFIGURE EXPRESS
function configureExpress() {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(cors());

  app.use(express.static("public"));
  app.use("/images", express.static("images"));

  // Health check route
  app.get("/", (req, res) => {
    res.status(200).json({
      status: "OK",
      message: "GyneCRM Backend Running",
    });
  });
}
//#endregion

//#region DATABASE CONNECTION
async function connectToDatabase() {
  try {
    const mongoUri =
      process.env.DB_CON_STRING_PROD ||
      process.env.DB_CON_STRING_DEV ||
      process.env.DB_CON_STRING_STAGE;

    const dbName =
      process.env.DB_NAME_PROD ||
      process.env.DB_NAME_DEV ||
      process.env.DB_NAME_STAGE;

    if (!mongoUri) {
      console.error("❌ MongoDB URI missing");
      process.exit(1);
    }

    await db.mongoose.connect(mongoUri, {
      dbName: dbName,
    });

    const connection = db.mongoose.connection;

    connection.on("connected", () => {
      console.log("✅ MongoDB connected");
    });

    connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err);
    });

    connection.on("disconnected", () => {
      console.warn("⚠ MongoDB disconnected");
    });
  } catch (error) {
    console.error("❌ DB connection failed:", error);
    process.exit(1);
  }
}
//#endregion

//#region START SERVER
async function startServer() {
  try {
    configureExpress();
    await connectToDatabase();

    const PORT = process.env.PORT || 5000;

    const server = http.createServer(app);
    expressWs(app, server);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
      mongoLogger("verbose", "SERVER", {
        dataStream: { log: `Server running on port ${PORT}` },
      });
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
//#endregion

module.exports = app;