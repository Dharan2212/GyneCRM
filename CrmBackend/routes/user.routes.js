const { verifyApiKey, verifyToken,auth } = require("../middleware/auth");
const express = require("express");
const {
  sendOtp,
  verifyAndLogin,
  getUserById,
  updateUser,
  logout,
  mobilelogout
} = require("../controllers/user_Auth.controller");

module.exports = function (app) {
  // Middleware to set CORS headers
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept" // Allow necessary headers for incoming requests
    );
    next(); // Proceed to the next middleware or route handler
  });

  app.post("/authuser/sendOtp", [verifyApiKey], sendOtp);
  app.post("/authuser/verifyAndLogin", [verifyApiKey], verifyAndLogin);
  app.get("/user/:id", [verifyApiKey], getUserById);
  app.put("/user/:id", [verifyApiKey], updateUser);
  app.post("/logout", [verifyApiKey], logout);
  app.post("/api/logout", [verifyApiKey], mobilelogout);
};
