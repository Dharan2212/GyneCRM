const mongoose = require("mongoose");
const mongooseAggregatePaginate = require("mongoose-aggregate-paginate-v2");
const { Schema } = mongoose;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const crypto = require("crypto");
// Helper function to generate unique Customer_Code
const generateUniqueCustomerCode = async function () {
  let uniqueCode;
  let isUnique = false;

  while (!isUnique) {
    uniqueCode = Math.floor(10000000 + Math.random() * 90000000).toString();

    // Check if the generated code already exists
    const existingUser = await mongoose.models.User.findOne({
      Customer_Code: uniqueCode,
    });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return uniqueCode;
};

// Unified User Schema
const UserSchema = new Schema(
  {
    // Common Fields
    FullName: { type: String, trim: true },
    useremail: { type: String, required: true, trim: true },
    Phone_number: { type: String, required: true, unique: true },
    Profile_photo_url: { type: String },
    Role: {
      type: String,
      enum: ["Medical_Owner", "Sales_Person"],
      required: true,
    },
    otp: { type: String, required: false, default: "none" },
    //new code for message central
    verificationId: { type: String }, // New field for Message Central verificationId
    phoneVerified: { type: Boolean, default: false },//new field for message central
    otp_expiry: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
    },
    additional_detail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
    },
    // Role-Specific Fields for 'Medical_Owner'
    Customer_Code: { type: String, unique: true, sparse: true },
    Party_Name: { type: String },
    Gst_No: { type: String },
    Address: { type: String },
    LandMark: { type: String },
    District: { type: String },
    State: { type: String },
    Licence_Details: {
      Drug_License_No: { type: String },
      License_Valid_Till: { type: String },
    },
    approved: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },

    // Role-Specific Fields for 'Sales_Person'
    licence: { type: String, default: null },
    
    //get Notifications for orders
    notifications: [
      {
        message: { type: String },
        isRead: { type: Boolean, default: false },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    //subscriptions:{type : String} //in future we need to uncomment
    // Settings (Flexible Key-Value Pairs)
    settings: { type: Map, of: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  // Notifications

  { timestamps: true }
);

// Pre-save hook to handle role-specific logic
UserSchema.pre("save", async function (next) {
  // Assign a unique Customer_Code for Medical Owners
  if (this.Role === "Medical_Owner" && !this.Customer_Code) {
    this.Customer_Code = await generateUniqueCustomerCode();
  }

  // Validation for 'Medical_Owner'
  if (this.Role === "Medical_Owner") {
    const requiredFields = [
      "Customer_Code",
      "Party_Name",
     // "Gst_No",
      "Address",
     // "LandMark",
      "District",
      "State",
    ];

    // Validate required fields
    for (const field of requiredFields) {
      if (!this[field]) {
        return next(
          new Error(`Field "${field}" is required for role "Medical_Owner"`)
        );
      }
    }

    // Validate nested Licence_Details
    if (
      !this.Licence_Details ||
      !this.Licence_Details.Drug_License_No ||
      !this.Licence_Details.License_Valid_Till
    ) {
      return next(
        new Error(
          'Both "Drug_License_No" and "License_Valid_Till" are required in "Licence_Details" for role "Medical_Owner"'
        )
      );
    }
  }

  // Validation for 'Sales_Person'
  if (this.Role === "Sales_Person") {
    if (this.licence && typeof this.licence !== "string") {
      return next(
        new Error('Field "licence" must be a string for role "Sales_Person"')
      );
    }
  }

  next();
});

// Exporting the User Model
module.exports = mongoose.model("User", UserSchema);
