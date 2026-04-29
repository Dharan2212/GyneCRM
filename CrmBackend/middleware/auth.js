// Importing required modules
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("../models/User.model");
const Admin = require("../models/Admin.model");

const { logger, log } = require("../services/logger.services");
const { checkUserExists } = require("../services/common.services");
const { API_MESSAGES, APICODES, LOGLEVEL, API_NAMES } = require("../constant/constants");
// Configuring dotenv to load environment variables from .env file
dotenv.config();
 
exports.verifyToken = (req, res, next) => {
  const accessToken = req.headers["x-access-token"];
  //console.log("recieved access token: " + accessToken);
  
  try {
    if (accessToken) {
      jwt.verify(accessToken, process.env.SECRET_KEY, async (error, decoded) => {
        if (error) {
          res.status(401).send({ Code: APICODES.UNAUTHORIZED, message: API_MESSAGES.UNAUTHORIZED });
          log(LOGLEVEL.ERROR, API_NAMES.VERIFY_ACCESS_TOKEN, accessToken, API_MESSAGES.UNAUTHORIZED);
          return;
        };
		//need to uncomments in future versions
        const userExists = await checkUserExists(decoded.email); //Subordinate function which will check if the user exists or not based on "UserId" 
        if (!userExists) {
          res.status(401).send({ Code: APICODES.UNAUTHORIZED, message: API_MESSAGES.UNAUTHORIZED });
          log(LOGLEVEL.ERROR, API_NAMES.VERIFY_ACCESS_TOKEN, accessToken, API_MESSAGES.UNAUTHORIZED);
          return;
        };
        req.userId = decoded.email;
        next();
      });
    } else if (!accessToken) {
      res.status(401).send({ Code: APICODES.UNAUTHORIZED, message: API_MESSAGES.UNAUTHORIZED });
      log(LOGLEVEL.ERROR, API_NAMES.VERIFY_ACCESS_TOKEN, accessToken, API_MESSAGES.UNAUTHORIZED);
      return;
    };
  } catch (error) {
    res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.ERROR });
    log(LOGLEVEL.ERROR, API_NAMES.VERIFY_ACCESS_TOKEN, accessToken, error);
    return;
  };
};
exports.verifyApiKey = (req, res, next) => {
  try {
    const apikey = req.headers["x-api-key"];
	//console.log("Received API Key:", apikey); // Log API key for debugging
    if (apikey) {
	//	console.log("No API key provided");
      if (apikey === process.env.API_KEY1) {
		console.log("API key validated successfully");
        next();
      } else {
        res.status(401).send({ Code: APICODES.UNAUTHORIZED, message: API_MESSAGES.UNAUTHORIZED });
        log(LOGLEVEL.ERROR, API_NAMES.VERIFY_API_KEY, requestBody, API_MESSAGES.UNAUTHORIZED);
        return;
      };
    };
  } catch (error) {
    res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.ERROR });
    log(LOGLEVEL.ERROR, API_NAMES.VERIFY_API_KEY, requestBody, error);
    return;
  };
};


// This function is used as middleware to authenticate user requests
exports.auth = (req, res, next) => {

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
  
exports.isUser = async (req, res, next) => {
	try {
		const userDetails = await User.findOne({ Phone_number: req.user.Phone_number });

		if (!userDetails) {
			res.status(401).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.MEDICAL_LIST.MEDICAL_API_MESSAGES });
	        log(LOGLEVEL.ERROR, API_NAMES.MEDICAL_OWNER_API, requestBody, error);
		    return;
		}
		next();
	} catch (error) {
		res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.ERROR });
	    log(LOGLEVEL.ERROR, API_NAMES.MEDICAL_OWNER_API, requestBody, error);
		return;
	}
};
exports.isAdmin = async (req, res, next) => {
	// const requestBody=req.user.Phone_number;
	try {
		//const userDetails = await User.findOne({ email: req.user.email });
        const userDetails = await Admin.findOne({ Phone_number: req.user.Phone_number });
		if (!userDetails || userDetails.Role !== "Admin") {
			res.status(401).send({ Code: APICODES.UNAUTHORIZED, message: API_MESSAGES.UNAUTHORIZED });
			log(LOGLEVEL.ERROR, API_MESSAGES.ADD_ADMIN.ADMIN_MESSAGE, userDetails, error);
			return;
		}
		next();
	} catch (error) {
		res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.ERROR });
	    log(LOGLEVEL.ERROR, API_NAMES.ADMIN_NOT_FOUND_API, error);
		return;
		 
	}
};
 
