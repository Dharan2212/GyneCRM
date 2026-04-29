const express = require("express")
const { 
    createUser,
    updateProfile,
    getUserDetails,
    deleteAccount,
    getAllUsers,
    approveMedicalOwner,
    getMedicalOwners,
    getSalesPersons,
    updateUserRole,
    updateUserStatus,
    getMedicalOwnersbyId,
    getSalesPersonById,
} = require('../../controllers/admin/admin_UserManagement.controller');


const {verifyApiKey,verifyToken,isAdmin}=require('../../middleware/auth');
 

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
//#region                                   Admin CreateUser for Mobile Application routes
// ********************************************************************************************************


 // Route to create a new user (Medical_Owner or Sales_Person)
 app.post("/admin/createUser",[verifyApiKey,verifyToken], createUser);

// Route to delete a user account
// by userId management in below 
app.delete("/admin/deleteUser/:id",[verifyApiKey,verifyToken], deleteAccount);

// Route for getting user details
app.get("/admin/getUserDetails/:id",[verifyApiKey,verifyToken], getUserDetails);

// Route for getting all user details
app.get("/admin/getAllUser",[verifyApiKey,verifyToken],  getAllUsers);


// Route for updating user profile
app.put("/admin/updateUser/:id",[verifyApiKey,verifyToken], updateProfile);


app.get("/admin/getAllMedicalUser",[verifyApiKey,verifyToken],  getMedicalOwners);
app.get("/admin/getMedicalUser/:id",[verifyApiKey,verifyToken], getMedicalOwnersbyId);
app.get("/admin/getAllSalesPerson",[verifyApiKey,verifyToken],  getSalesPersons);
app.get("/admin/getSalesPerson/:id",[verifyApiKey,verifyToken], getSalesPersonById);
app.put("/admin/approveMedicalOwner/:id",[verifyApiKey,verifyToken],  approveMedicalOwner);
app.put("/admin/updateUserRole",[verifyApiKey,verifyToken],  updateUserRole);
app.put("/admin/updateUserStatus/:id",[verifyApiKey,verifyToken],  updateUserStatus);
//app.get("admin/getAllBlockedUser",[verifyApiKey,verifyToken],  getAllUsers);
//app.get("admin/getAllUnblockedUser",[verifyApiKey,verifyToken],  getAllUsers);
 

 

};

