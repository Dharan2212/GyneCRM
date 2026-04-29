const User = require("../models/User.model");
const { sendOTP } = require("../services/otpSender.services");
const { randomInt } = require("crypto");
const jwt = require("jsonwebtoken");
const { log } = require("../services/logger.services");
const { sendOtp,verifyOtp }=require("./messageCentral.controller.js");
require('dotenv').config();
const {
  API_MESSAGES,
  API_NAMES,
  LOGLEVEL,
  STATUS,
  APICODES,
  USER_ROLES,
} = require("../constant/constants");

// Send OTP  using fast2sms service
exports.sendOtp1 = async (req, res) => {
  const { mobile } = req.body;
  const requestBody = req.body;
  if (!mobile) {
    res.status(404).send({
      Code: APICODES.NOT_FOUND,
      message: API_MESSAGES.LOGIN.INVALID_USER,
    });
    log(
      LOGLEVEL.WARN,
      API_NAMES.LOGIN_API,
      requestBody,
      API_MESSAGES.LOGIN.INVALID_USER
    );
    return;
  }
  // Fixed OTP for a specific mobile number
  const FIXED_MOBILE = "8767579124";
  const FIXED_OTP = 2022;

  // const otp = randomInt(1000, 9999);
  // const otpExpiration = Date.now() + 300000; // OTP valid for 5 minutes

// for testing purpose of andriod app 
  const otp = mobile === FIXED_MOBILE ? FIXED_OTP : randomInt(1000, 9999); // Generate 4-digit OTP
  const otpExpiration = Date.now() + 5 * 60 * 1000;  //Valid for 5 minutes

  try {
    const user = await User.findOneAndUpdate(
      { Phone_number: mobile },
      { otp, otpExpiration },
      { new: true }
    );

    if (!user) {
      res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.LOGIN.INVALID_USER,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.LOGIN.INVALID_USER
      );
      return;
    }

    await sendOTP(mobile, otp);
    const filteredUserDetails = {
      phone: mobile,
      otp: otp,
    };

    res.status(201).send({
      Code: APICODES.CREATED,
      message: API_MESSAGES.OTP_VERIFICATION.OTP_SUCCESS.replace("{0}", mobile),
      data: filteredUserDetails,
    });
    log(
      LOGLEVEL.INFO,
      API_NAMES.REGISTER_API,
      requestBody,
      "OTP sent successfully for login"
    );
  } catch (error) {
    console.error("Error sending mobile OTP:", error);
    res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    log(
      LOGLEVEL.ERROR,
      API_NAMES.OTP_API,
      requestBody,
      API_MESSAGES.ERROR,
      true,
      STATUS.FAILED
    );
  }
};

 
// Send OTP for login using message central service
  exports.sendOtp = async (req, res) => {
  const { mobile } = req.body;
  const requestBody = req.body;

  // Validate mobile number
  if (!mobile) {
    res.status(404).send({
      Code: APICODES.NOT_FOUND,
      message: API_MESSAGES.LOGIN.INVALID_USER,
    });
    log(
      LOGLEVEL.WARN,
      API_NAMES.LOGIN_API,
      requestBody,
      API_MESSAGES.LOGIN.INVALID_USER
    );
    return;
  }
  
  // check if mobile number exists in the database
  const user = await User.findOne({ Phone_number: mobile });
  if (!user) {
    res.status(404).send({
      Code: APICODES.NOT_FOUND,
      message: API_MESSAGES.LOGIN.INVALID_USER,
    });
    log(
      LOGLEVEL.WARN,
      API_NAMES.LOGIN_API,
      requestBody,
      API_MESSAGES.LOGIN.INVALID_USER
    );
    return;
  }
  
  // Fixed OTP for a specific mobile number
  const FIXED_MOBILE = "8767579124";
  const FIXED_OTP = 2022;

  let otp, otpExpiration, verificationId;

  try {
    // Handle fixed mobile number case
    if (mobile === FIXED_MOBILE) {
      otp = FIXED_OTP;
      otpExpiration = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes
      verificationId = "123714"; // Mocked verificationId for fixed mobile

      const user = await User.findOneAndUpdate(
        { Phone_number: mobile },
        { otp, otpExpiration, verificationId },
        { new: true }
      );

      if (!user) {
        res.status(404).send({
          Code: APICODES.NOT_FOUND,
          message: API_MESSAGES.LOGIN.INVALID_USER,
        });
        log(
          LOGLEVEL.WARN,
          API_NAMES.LOGIN_API,
          requestBody,
          API_MESSAGES.LOGIN.INVALID_USER
        );
        return;
      }

      res.status(201).send({
        Code: APICODES.CREATED,
        message: API_MESSAGES.OTP_VERIFICATION.OTP_SUCCESS.replace("{0}", mobile),
        data: { phone: mobile, otp, verificationId },
      });
      log(
        LOGLEVEL.INFO,
        API_NAMES.REGISTER_API,
        requestBody,
        "OTP mocked for fixed mobile"
      );
      return;
    }

    // Common sendOtpAndValidate function
    const sendOtpAndValidate = async () => {
      const sendOtpResponse = await sendOtp({ body: { phoneNumber: mobile } }, res);
      verificationId = sendOtpResponse?.data?.verificationId;
      const timeout = parseFloat(sendOtpResponse?.data?.timeout) || 60;
      const responseCode = sendOtpResponse?.data?.responseCode;

      if (!sendOtpResponse?.data || responseCode !== "200") {
        throw new Error(
          `Failed to send OTP: Response code ${responseCode || 'unknown'}, Response: ${
            JSON.stringify(sendOtpResponse) || 'no response'
          }`
        );
      }
      if (!verificationId) {
        throw new Error(
          `Failed to retrieve verificationId from sendOtp response: ${JSON.stringify(sendOtpResponse)}`
        );
      }
      otpExpiration = Date.now() + timeout * 1000;
      // Note: OTP is not directly available from sendOtp response in this case
    //  otp = randomInt(1000, 9999); // Generate random OTP as fallback
    };

    // Call sendOtpAndValidate for non-fixed mobile
    await sendOtpAndValidate();

    const user = await User.findOneAndUpdate(
      { Phone_number: mobile },
      { otpExpiration, verificationId },
      { new: true }
    );

    if (!user) {
      res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.LOGIN.INVALID_USER,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.LOGIN.INVALID_USER
      );
      return;
    }

    res.status(201).send({
      Code: APICODES.CREATED,
      message: API_MESSAGES.OTP_VERIFICATION.OTP_SUCCESS.replace("{0}", mobile),
      data: { phone: mobile, verificationId },
    });
    log(
      LOGLEVEL.INFO,
      API_NAMES.REGISTER_API,
      requestBody,
      "OTP sent successfully for login"
    );
  } catch (error) {
    console.error("Error sending mobile OTP:", error);
    res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    log(
      LOGLEVEL.ERROR,
      API_NAMES.OTP_API,
      requestBody,
      API_MESSAGES.ERROR,
      true,
      STATUS.FAILED
    );
  }
};

// Verify OTP and Auto Login using fast2sms service
exports.verifyAndLogin1 = async (req, res) => {
  const requestBody = req.body;
  const { mobile, otp } = requestBody;
  if (!mobile || !otp) {
    res.status(400).send({
      Code: APICODES.BAD_REQUEST,
      message: "Mobile number and OTP are required.",
    });
    log(
      LOGLEVEL.WARN,
      API_NAMES.LOGIN_API,
      requestBody,
      "Mobile number and OTP are required."
    );
    return;
  }

  try {
    const user = await User.findOne({ Phone_number: mobile });

    if (!user) {
      res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.LOGIN.INVALID_USER,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.LOGIN.INVALID_USER
      );
      return;
    }
    // Check if OTP matches
    if (user.otp !== otp) {
      res.status(400).send({
        Code: APICODES.BAD_REQUEST,
        message: API_MESSAGES.OTP.INVALID_OTP,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.OTP.INVALID_OTP
      );
      return;
    }

    // Check if OTP is expired
    if (user.otpExpiration < Date.now()) {
      res.status(400).send({
        Code: APICODES.BAD_REQUEST,
        message: "The OTP has expired. Please request a new OTP.",
      });
      log(LOGLEVEL.WARN, API_NAMES.LOGIN_API, requestBody, "OTP expired.");
      return;
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpiration = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.Role },
      process.env.SECRET_KEY,
      { expiresIn: "48h" }
    );

    // Set token as HTTP-only cookie
    const options = {
      //we need to change token details
      expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Token cookie valid for 10 days
      httpOnly: true,
    };
    const filteredUserDetails = {
      id: user._id,
      phone: user.Phone_number,
      role: user.Role,
      token: token,
    };
    res.cookie("token", token, options).status(200).json({
      success: true,
      message: "User logged in successfully.",
      data: filteredUserDetails,
    });
    log(
      LOGLEVEL.INFO,
      API_NAMES.LOGIN_API,
      requestBody,
      "User logged in successfully."
    );
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    log(
      LOGLEVEL.ERROR,
      API_NAMES.LOGIN_API,
      requestBody,
      API_MESSAGES.ERROR,
      true,
      STATUS.FAILED
    );
  }
};
// message central login
exports.verifyAndLogin = async (req, res) => {
  const requestBody = req.body;
  const { mobile, otp } = requestBody;
  if (!mobile || !otp) {
    res.status(400).send({
      Code: APICODES.BAD_REQUEST,
      message: "Mobile number and OTP are required.",
    });
    log(
      LOGLEVEL.WARN,
      API_NAMES.LOGIN_API,
      requestBody,
      "Mobile number and OTP are required."
    );
    return;
  }

  try {
    const user = await User.findOne({ Phone_number: mobile });

    if (!user) {
      res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.LOGIN.INVALID_USER,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.LOGIN.INVALID_USER
      );
      return;
    }
    // Check if OTP matches  new changes in progress 
    
    // if (user.otp !== otp) {
    //   res.status(400).send({
    //     Code: APICODES.BAD_REQUEST,
    //     message: API_MESSAGES.OTP.INVALID_OTP,
    //   });
    //   log(
    //     LOGLEVEL.WARN,
    //     API_NAMES.LOGIN_API,
    //     requestBody,
    //     API_MESSAGES.OTP.INVALID_OTP
    //   );
    //   return;
    // }
    const FIXED_MOBILE = "8767579124";
    const FIXED_OTP = 2022;
    if (mobile === FIXED_MOBILE) {
      if (otp != FIXED_OTP) {   // Use != for comparison since otp might be a string
        res.status(400).send({
          Code: APICODES.BAD_REQUEST,
          message: API_MESSAGES.OTP_VERIFICATION.INVALID_OTP,
        });
        log(
          LOGLEVEL.WARN,
          API_NAMES.LOGIN_API,
          requestBody,
          API_MESSAGES.OTP_VERIFICATION.INVALID_OTP
        );
        return;
      }

      if (user.phoneOtpExpiration < Date.now()) {
        res.status(400).send({
          Code: APICODES.BAD_REQUEST,
          message: "The OTP has expired. Please request a new OTP.",
        });
        log(LOGLEVEL.WARN, API_NAMES.LOGIN_API, requestBody, "OTP expired.");
        return;
      }

       // Clear OTP fields
    user.otp = undefined;
    user.otpExpiration = undefined;

    //new changes
    user.verificationId = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.Role },
      process.env.SECRET_KEY,
      { expiresIn: "48h" }
    );

    // Set token as HTTP-only cookie
    const options = {
      //we need to change token details
      expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Token cookie valid for 10 days
      httpOnly: true,
    };
    const filteredUserDetails = {
      id: user._id,
      phone: user.Phone_number,
      role: user.Role,
      token: token,
    };
    res.cookie("token", token, options).status(200).json({
      success: true,
      message: "User logged in successfully.",
      data: filteredUserDetails,
    });
    log(
      LOGLEVEL.INFO,
      API_NAMES.LOGIN_API,
      requestBody,
      "User logged in successfully."
    );
    return;
    }
    // Check if verificationId exists
    if (!user.verificationId) {
      res.status(400).send({
        Code: APICODES.BAD_REQUEST,
        message: "No OTP request found. Please request a new OTP.",
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.OTP_API,
        requestBody,
        "No verificationId found for user."
      );
      return;
    }

    // Check if OTP is expired
    if (user.otpExpiration < Date.now()) {
      res.status(400).send({
        Code: APICODES.BAD_REQUEST,
        message: "The OTP has expired. Please request a new OTP.",
      });
      log(LOGLEVEL.WARN, API_NAMES.LOGIN_API, requestBody, "OTP expired.");
      return;
    }
   //new code is added 
    // Check if OTP matches
    const verifyOtpResponse = await verifyOtp(
      { body: { verificationId: user.verificationId, phoneNumber: mobile, otp } },
      res
    );
    if (res.statusCode && res.statusCode !== 200) {
      // If verifyOtp already sent a response (e.g., error), return early
      return;
    }
      if (!verifyOtpResponse?.data?.verificationStatus || verifyOtpResponse.data.verificationStatus !== "VERIFICATION_COMPLETED") {
      res.status(400).send({
        Code: APICODES.BAD_REQUEST,
        message: API_MESSAGES.OTP_VERIFICATION.INVALID_OTP,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.OTP_VERIFICATION.INVALID_OTP
      );
      return;
    }


    // Clear OTP fields
    user.otp = undefined;
    user.otpExpiration = undefined;

    //new changes
    user.verificationId = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.Role },
      process.env.SECRET_KEY,
      { expiresIn: "48h" }
    );

    // Set token as HTTP-only cookie
    const options = {
      //we need to change token details
      expires: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Token cookie valid for 10 days
      httpOnly: true,
    };
    const filteredUserDetails = {
      id: user._id,
      phone: user.Phone_number,
      role: user.Role,
      token: token,
    };
    res.cookie("token", token, options).status(200).json({
      success: true,
      message: "User logged in successfully.",
      data: filteredUserDetails,
    });
    log(
      LOGLEVEL.INFO,
      API_NAMES.LOGIN_API,
      requestBody,
      "User logged in successfully."
    );
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    log(
      LOGLEVEL.ERROR,
      API_NAMES.LOGIN_API,
      requestBody,
      API_MESSAGES.ERROR,
      true,
      STATUS.FAILED
    );
  }
};

exports.logout = async (req, res) => {
  try {
    // Clear the token from the cookies
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure flag in production
      sameSite: "strict", // Ensures cookies are sent only to the same site
    });

    return res.status(200).json({
      Code: APICODES.SUCCESS,
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    log(LOGLEVEL.ERROR,API_NAMES.LOGIN_API,requestBody,API_MESSAGES.ERROR,true,STATUS.FAILED);
  }
};
exports.getUserById = async (req, res) => {
  const requestBody = req.body;
  const userId = req.params.id;

  if (!userId) {
    res.status(400).send({
      Code: APICODES.BAD_REQUEST,
      message: "User ID is required",
    });
    log(LOGLEVEL.WARN, API_NAMES.USER_API, requestBody, "User ID is required");
    return;
  }

  try {
    const user = await User.findById(userId)
      .populate("additional_detail")
      .populate("createdBy", "FullName Role")
      .populate("updatedBy", "FullName Role");

    if (!user) {
      res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.LOGIN.INVALID_USER,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.USER_API,
        requestBody,
        API_MESSAGES.LOGIN.INVALID_USER
      );
      return;
    }

    // Prepare user details based on role
    const baseUserDetails = {
      id: user._id,
      FullName: user.FullName,
      useremail: user.useremail,
      Phone_number: user.Phone_number,
      Profile_photo_url: user.Profile_photo_url,
      Role: user.Role,
      additional_detail: user.additional_detail,
      notifications: user.notifications,
      settings: Object.fromEntries(user.settings || new Map()),
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy,
    };

    let filteredUserDetails;

    if (user.Role === "Medical_Owner") {
      filteredUserDetails = {
        ...baseUserDetails,
        Customer_Code: user.Customer_Code,
        Party_Name: user.Party_Name,
        Gst_No: user.Gst_No,
        Address: user.Address,
        LandMark: user.LandMark,
        District: user.District,
        State: user.State,
        Licence_Details: user.Licence_Details,
        approved: user.approved,
      };
    } else if (user.Role === "Sales_Person") {
      filteredUserDetails = {
        ...baseUserDetails,
        licence: user.licence,
      };
    }

    res.status(200).send({
      Code: APICODES.SUCCESS,
      message: "User details retrieved successfully",
      data: filteredUserDetails,
    });
    log(
      LOGLEVEL.INFO,
      API_NAMES.USER_API,
      requestBody,
      "User details retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    log(
      LOGLEVEL.ERROR,
      API_NAMES.USER_API,
      requestBody,
      API_MESSAGES.ERROR,
      true,
      STATUS.FAILED
    );
  }
};

// Update user details by user ID
exports.updateUser = async (req, res) => {
  const requestBody = req.body;
  const userId = req.params.id;

  // Check if user ID is provided
  if (!userId) {
    res.status(400).send({
      Code: APICODES.BAD_REQUEST,
      message: "User ID is required.",
    });
    log(LOGLEVEL.WARN, API_NAMES.USER_API, requestBody, "User ID is required.");
    return;
  }

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.LOGIN.INVALID_USER,
      });
      log(
        LOGLEVEL.WARN,
        API_NAMES.USER_API,
        requestBody,
        API_MESSAGES.LOGIN.INVALID_USER
      );
      return;
    }

    // Update fields based on the provided request body
    if (requestBody.FullName) user.FullName = requestBody.FullName;
    if (requestBody.useremail) user.useremail = requestBody.useremail;
    if (requestBody.Phone_number) user.Phone_number = requestBody.Phone_number;
    if (requestBody.Profile_photo_url)
      user.Profile_photo_url = requestBody.Profile_photo_url;
    if (requestBody.status) user.status = requestBody.status;

    // Role-specific fields
    if (user.Role === "Medical_Owner") {
      // Validate if 'Medical_Owner' role has required fields
      if (requestBody.Party_Name) user.Party_Name = requestBody.Party_Name;
      if (requestBody.Gst_No) user.Gst_No = requestBody.Gst_No;
      if (requestBody.Address) user.Address = requestBody.Address;
      if (requestBody.LandMark) user.LandMark = requestBody.LandMark;
      if (requestBody.District) user.District = requestBody.District;
      if (requestBody.State) user.State = requestBody.State;

      // Update Licence Details for 'Medical_Owner'
      if (requestBody.Licence_Details) {
        if (requestBody.Licence_Details.Drug_License_No)
          user.Licence_Details.Drug_License_No =
            requestBody.Licence_Details.Drug_License_No;
        if (requestBody.Licence_Details.License_Valid_Till)
          user.Licence_Details.License_Valid_Till =
            requestBody.Licence_Details.License_Valid_Till;
      }
    } else if (user.Role === "Sales_Person") {
      // Update 'Sales_Person' specific fields
      if (requestBody.licence) user.licence = requestBody.licence;
    }

    // Update optional settings map
    if (requestBody.settings) {
      user.settings = { ...user.settings, ...requestBody.settings };
    }

    // Save the updated user to the database
    user.updatedAt = Date.now();
    const updatedUser = await user.save();

    // Return the updated user details as response
    const filteredUserDetails = {
      id: updatedUser._id,
      FullName: updatedUser.FullName,
      useremail: updatedUser.useremail,
      Phone_number: updatedUser.Phone_number,
      Profile_photo_url: updatedUser.Profile_photo_url,
      Role: updatedUser.Role,
      status: updatedUser.status,
      additional_detail: updatedUser.additional_detail,
      notifications: updatedUser.notifications,
      settings: Object.fromEntries(updatedUser.settings || new Map()),
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      createdBy: updatedUser.createdBy,
      updatedBy: updatedUser.updatedBy,
    };

    if (updatedUser.Role === "Medical_Owner") {
      filteredUserDetails.Customer_Code = updatedUser.Customer_Code;
      filteredUserDetails.Party_Name = updatedUser.Party_Name;
      filteredUserDetails.Gst_No = updatedUser.Gst_No;
      filteredUserDetails.Address = updatedUser.Address;
      filteredUserDetails.LandMark = updatedUser.LandMark;
      filteredUserDetails.District = updatedUser.District;
      filteredUserDetails.State = updatedUser.State;
      filteredUserDetails.Licence_Details = updatedUser.Licence_Details;
    } else if (updatedUser.Role === "Sales_Person") {
      filteredUserDetails.licence = updatedUser.licence;
    }

    res.status(200).send({
      Code: APICODES.SUCCESS,
      message: "User updated successfully.",
      data: filteredUserDetails,
    });
    log(
      LOGLEVEL.INFO,
      API_NAMES.USER_API,
      requestBody,
      "User updated successfully."
    );
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    log(
      LOGLEVEL.ERROR,
      API_NAMES.USER_API,
      requestBody,
      API_MESSAGES.ERROR,
      true,
      STATUS.FAILED
    );
  }
};

exports.mobilelogout = async (req, res) => {
  try {
    // Get the token from Authorization header 
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
      return res.status(400).json({
        Code: APICODES.BAD_REQUEST,
        message: "No authentication token provided",
      });
    }

    // Verify token  
    try {
      jwt.verify(token, process.env.SECRET_KEY);
    } catch (verifyError) {
      return res.status(401).json({
        Code: APICODES.UNAUTHORIZED,
        message: "Invalid or expired token",
      });
    }
 

    res.status(200).json({
      Code: APICODES.SUCCESS,
      success: true,
      message: "Logout successful",
    });
    
    log(
      LOGLEVEL.INFO,
      API_NAMES.LOGOUT_API,
      { token: token.substring(0, 10) + "..." }, // Log partial token for security
      "User logged out successfully"
    );

  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.ERROR,
    });
    
    log(
      LOGLEVEL.ERROR,
      API_NAMES.LOGOUT_API,
      { error: error.message },
      API_MESSAGES.ERROR,
      true,
      STATUS.FAILED
    );
  }
};
 

 

