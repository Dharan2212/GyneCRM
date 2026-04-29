const ShippingAddress = require("../models/Shipping_address.model");
const mongoose = require("mongoose")
const {
  ADDRESS_API_MESSAGES,
  ADDRESS_API_NAMES,
  APICODES,
  LOGLEVEL,
  STATUS,
} = require("../constant/constants");
const { log } = require("../services/logger.services");
// Create Address
exports.createAddress = async (req, res) => {
  const requestBody = req.body;
  try {
    const { addressLine1, addressLine2, pincode, city, state, country,userId } = requestBody;
    

    if (!addressLine1 || !pincode || !city || !state  ) {
      res.status(400).json({
        Code: APICODES.BAD_REQUEST,
        message: ADDRESS_API_MESSAGES.CREATE_ADDRESS.INVALID_REQUEST,
      });
      log(LOGLEVEL.WARN, ADDRESS_API_NAMES.CREATE_ADDRESS, requestBody, ADDRESS_API_MESSAGES.CREATE_ADDRESS.INVALID_REQUEST);
      return;
    }

    const address = new ShippingAddress({
      userId,
      addressLine1,
      addressLine2,
      city,
      country,
      pincode,
      state,
    });

    await address.save();

    res.status(201).json({
      Code: APICODES.SUCCESS,
      message: ADDRESS_API_MESSAGES.CREATE_ADDRESS.SUCCESS,
      data: address,
    });

    log(LOGLEVEL.INFO, ADDRESS_API_NAMES.CREATE_ADDRESS, requestBody, ADDRESS_API_MESSAGES.CREATE_ADDRESS.SUCCESS);
  } catch (error) {
    res.status(500).json({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: ADDRESS_API_MESSAGES.CREATE_ADDRESS.ERROR,
    });
    log(LOGLEVEL.ERROR, ADDRESS_API_NAMES.CREATE_ADDRESS, requestBody, error.message, true, STATUS.FAILED);
  }
};

// Get All Addresses with Pagination
exports.getAllAddresses = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { userId } = req.params;

    // Debug: Check if userId is received
    //console.log("Received userId:", userId);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid userId format:", userId);
      return res.status(400).json({
        Code: APICODES.BAD_REQUEST,
        message: ADDRESS_API_MESSAGES.GET_ADDRESSES.INVALID_ID,
      });
    }

    // Convert userId to ObjectId for MongoDB queries
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Aggregation for pagination
    const addressAggregation = ShippingAddress.aggregate([
      { $match: { userId: userObjectId } }, // Fix: Ensure `userId` is ObjectId
    ]);

    const addresses = await ShippingAddress.aggregatePaginate(addressAggregation, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      customLabels: {
        totalDocs: "totalAddresses",
        docs: "addresses",
      },
    });

   // Debug: Check the fetched addresses
   // console.log("Fetched addresses:", addresses);

    if (!addresses || addresses.addresses.length === 0) {
      console.warn("No addresses found for user:", userId);
      return res.status(404).json({
        Code: APICODES.NOT_FOUND,
        message: ADDRESS_API_MESSAGES.GET_ADDRESSES.NOT_FOUND,
      });
    }

    return res.status(200).json({
      Code: APICODES.SUCCESS,
      message: ADDRESS_API_MESSAGES.GET_ADDRESSES.SUCCESS,
      data: addresses,
    });

  } catch (error) {
    console.error("Error fetching addresses:", error);
    return res.status(500).json({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: ADDRESS_API_MESSAGES.GET_ADDRESSES.ERROR,
      error: error.message,
    });
  }
};


// Get Address by ID
exports.getAddressById = async (req, res) => {
  try {
    const { userId } = req.params;

    // Debug: Check userId received
   // console.log("Received userId:", userId);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error("Invalid userId format:", userId);
      return res.status(400).json({
        Code: APICODES.BAD_REQUEST,
        message: ADDRESS_API_MESSAGES.GET_ADDRESS.INVALID_ID,
      });
    }

    // Fetch addresses for the user
    const addresses = await ShippingAddress.find({ userId });

    // Debug: Check if addresses are found
  //  console.log("Fetched addresses:", addresses);

    if (!addresses || addresses.length === 0) {
      console.warn("No addresses found for user:", userId);
      return res.status(404).json({
        Code: APICODES.NOT_FOUND,
        message: ADDRESS_API_MESSAGES.GET_ADDRESS.NOT_FOUND,
      });
    }

    return res.status(200).json({
      Code: APICODES.SUCCESS,
      message: ADDRESS_API_MESSAGES.GET_ADDRESS.SUCCESS,
      data: addresses,
    });

  } catch (error) {
    console.error("Error fetching address:", error);
    return res.status(500).json({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: ADDRESS_API_MESSAGES.GET_ADDRESS.ERROR,
      error: error.message,
    });
  }
};

// Update Address
exports.updateAddress = async (req, res) => {
  try {
   
    const { addressLine1, addressLine2, pincode, city, state, country,addressId,userId } = req.body;
   

    const address = await ShippingAddress.findOneAndUpdate(
      { _id: addressId, userId },
      { $set: { addressLine1, addressLine2, city, country, pincode, state } },
      { new: true }
    );

    if (!address) {
      res.status(404).json({
        Code: APICODES.NOT_FOUND,
        message: ADDRESS_API_MESSAGES.UPDATE_ADDRESS.NOT_FOUND,
      });
      log(LOGLEVEL.WARN, ADDRESS_API_NAMES.UPDATE_ADDRESS, { addressId }, ADDRESS_API_MESSAGES.UPDATE_ADDRESS.NOT_FOUND);
      return;
    }

    res.status(200).json({
      Code: APICODES.SUCCESS,
      message: ADDRESS_API_MESSAGES.UPDATE_ADDRESS.SUCCESS,
      data: address,
    });

    log(LOGLEVEL.INFO, ADDRESS_API_NAMES.UPDATE_ADDRESS, { addressId }, ADDRESS_API_MESSAGES.UPDATE_ADDRESS.SUCCESS);
  } catch (error) {
    res.status(500).json({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: ADDRESS_API_MESSAGES.UPDATE_ADDRESS.ERROR,
    });
    log(LOGLEVEL.ERROR, ADDRESS_API_NAMES.UPDATE_ADDRESS, { error: error.message }, ADDRESS_API_MESSAGES.UPDATE_ADDRESS.ERROR, true, STATUS.FAILED);
  }
};

// Delete Address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId, userId } = req.body;
     
    const address = await ShippingAddress.findOneAndDelete({ _id: addressId, userId });

    if (!address) {
      res.status(404).json({
        Code: APICODES.NOT_FOUND,
        message: ADDRESS_API_MESSAGES.DELETE_ADDRESS.NOT_FOUND,
      });
      log(LOGLEVEL.WARN, ADDRESS_API_NAMES.DELETE_ADDRESS, { addressId }, ADDRESS_API_MESSAGES.DELETE_ADDRESS.NOT_FOUND);
      return;
    }

    res.status(200).json({
      Code: APICODES.SUCCESS,
      message: ADDRESS_API_MESSAGES.DELETE_ADDRESS.SUCCESS,
      data: { deletedAddress: address },
    });

    log(LOGLEVEL.INFO, ADDRESS_API_NAMES.DELETE_ADDRESS, { addressId }, ADDRESS_API_MESSAGES.DELETE_ADDRESS.SUCCESS);
  } catch (error) {
    res.status(500).json({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: ADDRESS_API_MESSAGES.DELETE_ADDRESS.ERROR,
    });
    log(LOGLEVEL.ERROR, ADDRESS_API_NAMES.DELETE_ADDRESS, { error: error.message }, ADDRESS_API_MESSAGES.DELETE_ADDRESS.ERROR, true, STATUS.FAILED);
  }
};
