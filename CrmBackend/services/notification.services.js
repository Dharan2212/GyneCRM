//#region IMPORTS
const admin = require("firebase-admin");
const serviceAccount = require("./fcm/fcm.json");
const apn = require("apn");
const { log } = require("./logger.services");
const { LOGLEVEL, API_NAMES, API_MESSAGES } = require("../constant/constants");
//const notificationsCollection = require("../models/Notification.model");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
//#endregion IMPORTS