//#region IMPORTS
const express = require("express"); // Express for server handling
const app = express(); // Initializing express application under node
const dotenv = require("dotenv"); // dotenv to load environment variables (Load .env variables)
dotenv.config(); // Load environment variables from .env file
const fs = require("fs"); // File system module for file operations
const path = require("path"); // Path module for handling file and directory paths
const cookieParser = require("cookie-parser");
const db = require("./models/index"); // MongoDB models for database operations
const { mongoLogger } = require("./services/logger.services"); // Custom logging service
const { APICODES } = require("./constant/constants"); // Constant values used throughout the application
//const deviceOfflineCron = require("./cron_services/device_offline.cron"); // Cron job service for handling offline device monitoring
const expressWs = require("express-ws"); // Express WebSocket support
const ws = require("express-ws")(app); // Initialize WebSocket with express
const multer = require("multer"); // Multer for handling file uploads
const cors = require("cors");
//uncomment when code in production build so that create connection in real time
//const https = require("https");
const http = require("http");
const fileUpload = require("express-fileupload");
//const gordonManorCron = require("./cron_services/gordon_manor.cron");//need to implement in future
//#endregion IMPORTS

//#region SERVER CONNECTION FUNCTION
/**
 * Starts the Express server and sets up the necessary configurations.
 * Connects to MongoDB and initializes all required services, such as change streams and cron jobs.
 */
async function startServer() {
  try {
    configureExpress(); // Configure express settings and middleware
    await connectToDatabase(); // Establish database connection
    //cloudinaryConnect();// Establish cloudinary connection
    // const sslOptions = {
    //   key: fs.readFileSync(path.join(__dirname, "./certificates/crm.com.key")), // Path to your server.key
    //   cert: fs.readFileSync(
    //     path.join(__dirname, "./certificates/985d409c2c916c98.crt")
    //   ), // Path to your server.crt
    // };

    //This setup is used for https setup
    //const server = https.createServer(sslOptions, app);
    // this is used for http setup for local setup for creating application and testing
    // purpose only local host
    const server = http.createServer(app);
    expressWs(app, server);
    if (process.env.ENVIRONMENT === "Production") {
      server.listen(process.env.PORT_PROD, "0.0.0.0", () => {
        console.log(
          `Secure server is running on port ${process.env.PORT_PROD}.`
        );
        mongoLogger("verbose", "SERVER", {
          dataStream: {
            log: `Secure server is running on port ${process.env.PORT_PROD}`,
          },
        });
      });
    } else if (process.env.ENVIRONMENT === "Development") {
      server.listen(process.env.PORT_DEV, () => {
        console.log(
          `Secure server is running on port ${process.env.PORT_DEV}.`
        );
        mongoLogger("verbose", "SERVER", {
          dataStream: {
            log: `Secure server is running on port ${process.env.PORT_DEV}`,
          },
        });
      });
    } else if (process.env.ENVIRONMENT === "Staging") {
      server.listen(process.env.PORT_STAGE, () => {
        console.log(
          `Secure server is running on port ${process.env.PORT_STAGE}.`
        );
        mongoLogger("verbose", "SERVER", {
          dataStream: {
            log: `Secure server is running on port ${process.env.PORT_STAGE}`,
          },
        });
      });
    }

    app.get("/", (req, res) => {
      res
        .status(200)
        .send({ Code: APICODES.NOT_FOUND, message: `Server is working!` });
    }); // Basic route to check server status (GET API request)
    console.log("Server started successfully.");
  } catch (error) {
    console.error("Server startup error:", error);
    mongoLogger("error", "SERVER", { dataStream: { error: error } });
    process.exit(1); // Exit the process if there is a fatal error
  }
}
//#endregion SERVER CONNECTION FUNCTION

//#region DATABASE CONNECTION FUNCTION
/**
 * Connects to the MongoDB database using the connection string and database name from the environment variables.
 * Logs successful connection or error upon failure.
 */
async function connectToDatabase() {
  if (process.env.ENVIRONMENT === "Production") {
    db.mongoose.connect(process.env.DB_CON_STRING_PROD, {
      dbName: process.env.DB_NAME_PROD,
    }); // MongoDb connection which requires connection string with username and password.
  } else if (process.env.ENVIRONMENT === "Development") {
    db.mongoose.connect(process.env.DB_CON_STRING_DEV, {
      dbName: process.env.DB_NAME_DEV,
    }); // MongoDb connection which requires connection string with username and password.
  } else if (process.env.ENVIRONMENT === "Staging") {
    db.mongoose.connect(process.env.DB_CON_STRING_STAGE, {
      dbName: process.env.DB_NAME_STAGE,
    }); // MongoDb connection which requires connection string with username and password.
  }
  const mongoConnection = db.mongoose.connection;
  mongoConnection.setMaxListeners(10);
  mongoConnection.on("connected", () => {
    console.log("Successfully connected to MongoDB.");
    mongoLogger("verbose", "SERVER", {
      dataStream: { log: `Successfully connected to MongoDB.` },
    });
  });

  mongoConnection.on("disconnected", () => {
    console.log("MongoDB connection lost.");
    mongoLogger("error", "SERVER", {
      dataStream: { error: "MongoDB connection lost." },
    });
  });

  mongoConnection.on("reconnected", () => {
    console.log("Reconnected to MongoDB, restarting streams...");
    mongoLogger("verbose", "SERVER", {
      dataStream: { log: "Reconnected to MongoDB, restarting streams." },
    });
  });
}

//#endregion DATABASE CONNECTION FUNCTION

//#region CONFIGURE EXPRESS APP and ROUTING
/**
 * Configures the express app by setting up middlewares for JSON parsing, URL encoding, and static files.
 * Also sets up WebSocket routes and imports API routes for authentication, users, configuration, etc.
 */
function configureExpress() {
  app.use(express.json()); // Middleware for parsing JSON requests
  app.use(express.urlencoded({ extended: true })); // Middleware for parsing URL-encoded requests

  // need to comment the following line if you do not want to multer
  // app.use(fileUpload()); // middleware for uploading files and parseing form
  app.use(cookieParser());
  app.use(express.static("public")); // Serve static files from the 'public' directory
  app.use("/images", express.static("images")); // Serve static images from the 'images' directory
  app.use(cors());
 //new code for cors by 12/03/2025
 
  // Import and configure application routes
  // require("./routes/user.routes")(app);

  
  // //require("./routes/profile.routes");
  // require("./routes/Payments.routes")(app);
  // require("./routes/admin/user.routes")(app);
}
//#endregion CONFIGURE EXPRESS APP AND ROUTING

//#region Entry point OR Function Call
startServer(); // Start the server by calling the startServer function
//#endregion Entry point OR Function Call

// Export the express app for potential reuse in tests or other modules
module.exports = app;
