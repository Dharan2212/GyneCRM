const { verifyApiKey, verifyToken,isAdmin,auth} = require("../middleware/auth");  
const express = require("express")
const {
   createUser,
   deleteAccount,
   getAllUserDetails,
   updateProfile
} = require("../controllers/admin/admin_UserManagement.controller")
 

module.exports = function (app) {
    // Middleware to set CORS headers
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept" // Allow necessary headers for incoming requests
        );
        next(); // Proceed to the next middleware or route handler
    });
   // ********************************************************************************************************
//                                      Creating User Profile by Admin  routes
// ********************************************************************************************************
// Delet User Account
app.delete("/api/admin/adduser/deleteProfile",[verifyApiKey,verifyToken,isAdmin], deleteAccount)
app.put("/api/admin/adduser/updateProfile", [verifyApiKey,verifyToken,isAdmin], updateProfile)
app.get("/api/admin/adduser/getUserDetails", [verifyApiKey,verifyToken,isAdmin], getAllUserDetails)
// Get Enrolled Courses
app.get("/api/admin/adduser/createNewUser", [verifyApiKey,verifyToken,isAdmin], createUser)

 
};


