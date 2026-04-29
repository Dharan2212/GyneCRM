const jwt = require("jsonwebtoken");
const { API_MESSAGES, APICODES, LOGLEVEL, API_NAMES } = require("../constant/constants");
const {log }= require("../services/logger.services")
const dotenv = require("dotenv");
dotenv.config();
module.exports = (req, res, next) => {
     const authHeader = req.headers.authorization;
     
       if (!authHeader || !authHeader.startsWith("Bearer ")) {
         log(LOGLEVEL.WARN, API_NAMES.AUTH_MIDDLEWARE, {}, API_MESSAGES.AUTHENTICATION.NO_TOKEN);
         return res.status(401).json({
           Code: APICODES.UNAUTHORIZED,
           message: API_MESSAGES.AUTHENTICATION.NO_TOKEN,
         });
       }
     
       const token = authHeader.split(" ")[1];
     
       try {
         const decoded = jwt.verify(token, process.env.SECRET_KEY);
         req.user = { id: decoded.id, role: decoded.role }; // Attach user to the request
         log(LOGLEVEL.INFO, API_NAMES.AUTH_MIDDLEWARE, { userId: decoded.id }, API_MESSAGES.AUTHENTICATION.VALID_TOKEN);
         next();
       } catch (error) {
         log(LOGLEVEL.ERROR, API_NAMES.AUTH_MIDDLEWARE, {}, API_MESSAGES.AUTHENTICATION.INVALID_TOKEN);
         return res.status(403).json({
           Code: APICODES.FORBIDDEN,
           message: API_MESSAGES.AUTHENTICATION.INVALID_TOKEN,
         });
       }
 };