 const { signup,changePassword,login,resetPassword,resetPasswordToken,sendotp } = require('../../controllers/admin/admin_Auth.controller');
const {verifyApiKey,verifyToken,isAdmin, auth}=require('../../middleware/auth');
 
//need to import controller over here 
//const { sendOtp,verifyAndLogin } = require("../controllers/user_Auth.controller")
 

module.exports = function (app) {
    // Middleware to set CORS headers
    app.use(function (req, res, next) {
		res.header(
			"Access-Control-Allow-Headers",
			"Origin, Content-Type, Accept" // Allow necessary headers for incoming requests
		);
		next(); // Proceed to the next middleware or route handler
	});


	// Routes for Login, Signup, and Authentication

// ********************************************************************************************************
//#region                                   Admin Authentication routes
// ********************************************************************************************************

//just for demo purposes
//router.post("/api/admin/register", [verifyApiKey, upload.single("profileImage"), adminRegistrationValidation], adminAuthenticationController.register);

// schema validation is remianing	
// Route for user login as a admin
//validatin is remaining
app.post("/admin/auth/login",[verifyApiKey], login)


// Route to register a new admin
	// POST request to /api/admin/signup
	// Middleware:
	// 1. verifyApiKey (validates the API key)
	// 3. adminRegistrationValidation (validates the request body for registration) which is remaining
	// Controller: admin_Auth.controller.signup (handles logic for admin registration)


//router.post("/signup",[verifyApiKey,isAdmin], signup)
app.post("/admin/auth/signup",[verifyApiKey], signup)
// Route for sending OTP to the user's email
app.post("/admin/auth/sendotp",[verifyApiKey], sendotp)

// Route for Changing the password
app.post("/admin/auth/changepassword",[verifyApiKey,auth], changePassword)

// Route for generating a reset password token
app.post("/admin/auth/reset-password-token",[verifyApiKey,auth], resetPasswordToken)

// Route for resetting user's password after verification
app.post("/admin/auth/reset-password",[verifyApiKey,auth], resetPassword)


    
 
};