//#region IMPORTS
const user = require("../models/Admin.model");
const { log } = require("../services/logger.services");
const { LOGLEVEL, API_NAMES } = require("../constant/constants");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const Counter = require("../models/Counter.model");
//#endregion IMPORTS

//#region CHECK USER EXISTS OR NOT
async function checkUserExists(email) {
  try {
    const existingUser = await user.findOne({ email: email });
    return !!existingUser; // will return true if the user exists & will return false if the user does not exist
  } catch (error) {
    log(LOGLEVEL.ERROR, API_NAMES.CHECK_USER, email, error);
    return;
  }
}
//#endregion CHECK USER EXISTS OR NOT
const getPaginatedPayload = (dataArray, page, limit) => {
  const startPosition = +(page - 1) * limit;

  const totalItems = dataArray.length; // total documents present after applying search query
  const totalPages = Math.ceil(totalItems / limit);

  dataArray = structuredClone(dataArray).slice(
    startPosition,
    startPosition + limit
  );

  const payload = {
    page,
    limit,
    totalPages,
    previousPage: page > 1,
    nextPage: page < totalPages,
    totalItems,
    currentPageItems: dataArray?.length,
    data: dataArray,
  };
  return payload;
};
const getMongoosePaginationOptions = ({
  page = 1,
  limit = 10,
  customLabels,
}) => {
  return {
    page: Math.max(page, 1),
    limit: Math.max(limit, 1),
    pagination: true,
    customLabels: {
      pagingCounter: "serialNumberStartFrom",
      ...customLabels,
    },
  };
};

// Define Multer storage and file filter
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory where files will be stored
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const fileTypes = /xlsx|xls/; // Allow only Excel files
  const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = fileTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel files are allowed!"));
  }
};

// Create the Multer instance
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter,
});

// Utility function to safely convert Decimal128 to string
const convertDecimal128 = (value) => {
  
  if (!value) return "0.00";
  return parseFloat(value.toString()).toFixed(2);
};

const getNextOrderNumber = async () => {
  const counter = await Counter.findOneAndUpdate(
    { name: "orderNumber" }, // Identify the counter by name
    { $inc: { sequenceValue: 1 } }, // Increment the sequenceValue
    { new: true, upsert: true } // Create if not exists
  );

  return `ORD${counter.sequenceValue}`;
};
//#region EXPORTS
module.exports = {
  checkUserExists,
  getPaginatedPayload,
  getMongoosePaginationOptions,
  upload,
  convertDecimal128,
  getNextOrderNumber,
};
//#endregion EXPORTS
