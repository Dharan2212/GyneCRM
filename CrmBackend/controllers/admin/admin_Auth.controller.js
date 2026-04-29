const bcrypt = require("bcrypt")
const crypto = require("crypto")
const User = require("../../models/Admin.model.js")
const OTP = require("../../models/OTP.model.js")
const jwt = require("jsonwebtoken")
const mongoose = require("mongoose");
const otpGenerator = require("otp-generator")
const multer = require("multer");
const {mailSender} = require("../../services/mailSender.services.js")
const { passwordUpdated } = require("../../mailTemplate/passwordUpdate.js")
const Profile = require("../../models/Profile.model.js")
const { log } = require("../../services/logger.services");
const { checkUserExists}= require("../../services/common.services")
 const { API_NAMES, LOGLEVEL, APICODES, API_MESSAGES, USER_ROLES, STATUS, } = require("../../constant/constants");
 const {
  s3Uploadv2,
  s3Uploadv3,
  deleteObject,
  getObject,
  putObject,
} = require("../../services/imageUploader.services.js");
require("dotenv").config() 
 
 
exports.signup = async (req, res) => {
  try {
    // Destructure fields from the request body
    const { 
      FullName,
      email,
      password,
      confirmPassword,
      Role,
      contactNumber,
      otp
    } = req.body
    const requestBody = req.body;
    // Check if All Details are there or not null or emp
    if (
      !FullName ||
      !Role ||
      !email ||
      !password ||
      !confirmPassword||
      !otp
       
    ) {
      res.status(403).send({
        success: APICODES.ERROR, 
        message: API_MESSAGES.REGISTRATION.REQUETBODY,
      })
      log(LOGLEVEL.ERROR,API_NAMES.REGISTER_API,requestBody,"User registration data is missing from requestBody");
      return;
    }
    // Check if password and confirm password match
    if (password !== confirmPassword) {
      res.status(400).send({ Code: APICODES.ERROR, message: API_MESSAGES.LOGIN.INCORRECT_PASSWORD });
      log(LOGLEVEL.INFO, API_NAMES.LOGIN_API, requestBody, API_MESSAGES.LOGIN.INCORRECT_PASSWORD, true, STATUS.SUCCESS, requestBody.email, API_MESSAGES.LOGIN.INCORRECT_PASSWORD);
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).send({ Code: APICODES.SUCCESS, message: API_MESSAGES.REGISTRATION.USER_EXISTS});
			log(LOGLEVEL.INFO, API_NAMES.REGISTER_API, requestBody, API_MESSAGES.REGISTRATION.USER_EXISTS, true, STATUS.SUCCESS, requestBody.email, API_MESSAGES.LOGIN.INCORRECT_PASSWORD);
			return;
    }
    
    // // Find the most recent OTP for the email
    const response = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1)
    console.log(response)
    if (response.length === 0) {
      // OTP not found for the email
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
    } else if (otp !== response[0].otp) {
      // Invalid OTP
      res.status(400).send({ Code: APICODES.NOT_FOUND, message: API_MESSAGES.OTP.OTP_NOT});
      log(LOGLEVEL.INFO, API_NAMES.REGISTER_API, requestBody, API_MESSAGES.OTP.OTP_FAIL, true, STATUS.FAILED, requestBody.email);
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      FullName,
      email,
      contactNumber,
      password: hashedPassword,
      Role: Role,
    })
    const filteredUserDetails = {
      _id: user._id,
      FullName: user.FullName,
      email: user.email,
      contactNumber: user.contactNumber,
      Role: user.Role,
      
    };
    res.status(200).send({ Code: APICODES.SUCCESS, message: API_MESSAGES.REGISTRATION.SUCCESS, data:filteredUserDetails });
    log(LOGLEVEL.INFO, API_NAMES.REGISTER_API,user, API_MESSAGES.REGISTRATION.SUCCESS, true, STATUS.SUCCESS, requestBody.email);
    return;
        
  } catch (error) {

    res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.REGISTRATION.ERROR });
    log(LOGLEVEL.ERROR, API_NAMES.REGISTER_API, requestBody, error, true, STATUS.FAILED, requestBody.email, API_MESSAGES.REGISTRATION.ERROR);
    		return;
      }

};


 
exports.login = async (req, res) => {
  // Destructure body
  const requestBody = req.body;
  try {
    // Get email and password from request body
    const { email, password } = req.body;

    // Check if email or password is missing
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill up all the required fields",
      });
    }

    // Find user by email
    let user = await User.findOne({ email });
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

    // Generate JWT token and compare password
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { email: user.email, id: user._id, role: user.Role },
        process.env.SECRET_KEY,
        {
          expiresIn: "4d", // Token valid for 24 hours
        }
      );
      const accessToken = token 
  
      const cookieToken = token;
      // Save token to user document in database
      user.token = token;
      user.password = undefined;
      res.cookie("token", cookieToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      // Return success response with token in the headers
      res.status(200)
        .header("x-access-token", token) // Send token in headers
        .json({
          code: APICODES.SUCCESS,
          message: API_MESSAGES.LOGIN.SUCCESS,
          token,
          accessToken,
          cookieToken,
          user,    
        });

      // Log the API call for monitoring and debugging
      log(
        LOGLEVEL.INFO,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.LOGIN.SUCCESS,
        true,
        STATUS.SUCCESS,
        requestBody.email
      );
      return;
    } else {
      res.status(400).send({
        Code: APICODES.UNAUTHORIZED,
        message: API_MESSAGES.LOGIN.INCORRECT_PASSWORD,
      });
      log(
        LOGLEVEL.INFO,
        API_NAMES.LOGIN_API,
        requestBody,
        API_MESSAGES.LOGIN.INCORRECT_PASSWORD,
        true,
        STATUS.FAILED
      );
      return;
    }
  } catch (error) {
    // Return 500 Internal Server Error status code with error message
    res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.LOGIN.ERROR,
    });
    log(
      LOGLEVEL.ERROR,
      API_NAMES.LOGIN_API,
      requestBody,
      error,
      true,
      STATUS.FAILED,
      requestBody.email,
      API_MESSAGES.LOGIN.ERROR
    );
    return;
  }
};

// Send OTP For Email Verification
exports.sendotp = async (req, res) => {
  
  try {
    const {email} = req.body;
     
    // Check if user is already present
    // Find user with provided email
    const checkUserPresent = await User.findOne({ email });
    // to be used in case of signup

    // If user found with provided email
    if (checkUserPresent) {
      // Return 401 Unauthorized status code with error message
      
      return res.status(401).json({
        success: false,
        message: `User is Already Registered`,
      })
    }

    var otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    })
    const result = await OTP.findOne({ otp: otp })
    console.log("Result is Generate OTP Func")
    console.log("OTP", otp)
    console.log("Result", result)
    while (result) {
      otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
      })
    }
    const otpPayload = { email, otp }
    console.log(otpPayload);
    
    const otpBody = await OTP.create(otpPayload)
    console.log("OTP Body", otpBody)
    res.status(200).json({
      success: true,
      message: `OTP Sent Successfully`,
      otp,
    })
  } catch (error) {
    console.log(error.message)
    return res.status(500).json({ success: false, error: error.message })
  }
}

// Controller for Changing Password
exports.changePassword = async (req, res) => {
  const requestBody = req.user.id;
  try {
    // Get user data from req.user
   // req.user = { id: '676126e7ba19e84b11055f74' }; //just for testing
   
    const userDetails = await User.findById(req.user.id);

    // Get old password, new password, and confirm new password from req.body
    const { oldPassword, newPassword } = req.body

    // Validate old password
    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      userDetails.password
    )
    if (!isPasswordMatch) {
      // If old password does not match, return a 401 (Unauthorized) error
      res.status(404).send({ Code: APICODES.NOT_FOUND, message: API_MESSAGES.CHANGE_PASSWORD.INVALID_USER });
			log(LOGLEVEL.WARN, API_NAMES.CHANGE_PASSWORD_API, requestBody, API_MESSAGES.CHANGE_PASSWORD.INVALID_USER);
			return;
    }

    // Update password
    const encryptedPassword = await bcrypt.hash(newPassword, 10)
    const updatedUserDetails = await User.findByIdAndUpdate(
      req.user.id,
      { password: encryptedPassword },
      { new: true }
    )

    // Send notification email
    try {
      const emailResponse = await mailSender(
        updatedUserDetails.email,
        "Password for your account has been updated",
        passwordUpdated(
          updatedUserDetails.email,
          `Password updated successfully for ${updatedUserDetails.FullName} ${updatedUserDetails.Role}`
        )
      )
      console.log("Email sent successfully:", emailResponse.response)
    } catch (error) {
      // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
      console.error("Error occurred while sending email:", error)
      return res.status(500).json({
        success: false,
        message: "Error occurred while sending email",
        error: error.message,
      })
    }

    // Return success response
    res.status(200).send({ Code: APICODES.SUCCESS, message: API_MESSAGES.CHANGE_PASSWORD.SUCCESS });
		log(LOGLEVEL.INFO, API_NAMES.CHANGE_PASSWORD_API, requestBody, API_MESSAGES.CHANGE_PASSWORD.SUCCESS, true, STATUS.SUCCESS);
		return;
  } catch (error) {
    // If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
    res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.CHANGE_PASSWORD.ERROR });
		log(LOGLEVEL.ERROR, API_NAMES.CHANGE_PASSWORD_API, requestBody, error, true, STATUS.FAILED, API_MESSAGES.CHANGE_PASSWORD.ERROR);
		return;
  }
}
exports.resetPasswordToken = async (req, res) => {
  try {
    const email = req.body.email
    const user = await User.findOne({ email: email })
    if (!user) {
      res.status(200).send({ Code: APICODES.NOT_FOUND, message: API_MESSAGES.EMAIL_VERIFICATION.INVALID_USER });
      log(LOGLEVEL.INFO, API_NAMES.EMAIL_VERIFICATION_API, requestBody, API_MESSAGES.EMAIL_VERIFICATION.INVALID_USER, true, STATUS.FAILED);
      return;
    }
    const token = crypto.randomBytes(20).toString("hex")

    const updatedDetails = await User.findOneAndUpdate(
      { email: email },
      {
        token: token,
        resetPasswordExpires: Date.now() + 3600000,
      },
      { new: true }
    )
    console.log("DETAILS", updatedDetails)

    const url = `http://localhost:3000/update-password/${token}`
    //const url = `https://oka-project/update-password/${token}`

    await mailSender(
      email,
      "Password Reset",
      `Your Link for email verification is ${url}. Please click this url to reset your password.`
    )
    res.status(200).send({ Code: APICODES.SUCCESS, message: API_MESSAGES.EMAIL_VERIFICATION.VERIFY_SUCCESS, data: url });
    log(LOGLEVEL.INFO, API_NAMES.EMAIL_VERIFICATION_API, requestBody, API_MESSAGES.EMAIL_VERIFICATION.VERIFY_SUCCESS, true, STATUS.SUCCESS, requestBody.weartechUserId);
    return;
    res.json({
      success: true,
      message:
        "Email Sent Successfully, Please Check Your Email to Continue Further",
    })
  } catch (error) {
    res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.EMAIL_VERIFICATION.ERROR });
		log(LOGLEVEL.ERROR, API_NAMES.EMAIL_VERIFICATION_API, error, true, STATUS.FAILED, API_MESSAGES.EMAIL_VERIFICATION.ERROR);
		return;
  }
}

exports.resetPassword = async (req, res) => {
  const { password, confirmPassword, token } = req.body
   const requestBody=req.body
  try {
    if (confirmPassword !== password) {
      res.status(404).send({ Code: APICODES.NOT_FOUND, message: API_MESSAGES.CHANGE_PASSWORD.INVALID_USER });
			log(LOGLEVEL.WARN, API_NAMES.CHANGE_PASSWORD_API, requestBody, API_MESSAGES.CHANGE_PASSWORD.INVALID_USER);
			return;
    }
    const userDetails = await User.findOne({ token: token })
    if (!userDetails) {
      res.status(404).send({ Code: APICODES.NOT_FOUND, message: API_MESSAGES.RESET_PASSWORD.INVALID_USER });
			log(LOGLEVEL.WARN, API_NAMES.RESET_PASSWORD_API, requestBody, API_MESSAGES.RESET_PASSWORD.INVALID_USER);
			return;
    }
    if (!(userDetails.resetPasswordExpires > Date.now())) {
      return res.status(403).json({
        Code: APICODES.INVALID,
        message: `Token is Expired, Please Regenerate Your Token`,
      })
    }
    const encryptedPassword = await bcrypt.hash(password, 10)
    await User.findOneAndUpdate(
      { token: token },
      { password: encryptedPassword },
      { new: true }
    )
    res.status(200).send({ Code: APICODES.SUCCESS, message: API_MESSAGES.RESET_PASSWORD.SUCCESS });
    log(LOGLEVEL.INFO, API_NAMES.RESET_PASSWORD_API, requestBody, API_MESSAGES.RESET_PASSWORD.SUCCESS, true, STATUS.SUCCESS);
    return;
  } catch (error) {
    res.status(500).send({ Code: APICODES.INTERNAL_SERVER_ERROR, message: API_MESSAGES.RESET_PASSWORD.ERROR });
		log(LOGLEVEL.ERROR, API_NAMES.RESET_PASSWORD_API, requestBody, error, true, STATUS.FAILED, API_MESSAGES.RESET_PASSWORD.ERROR);
		return;
  }
}
