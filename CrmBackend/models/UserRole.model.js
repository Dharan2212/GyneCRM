const mongoose = require('mongoose');

// Schema for User Roles
const UserRoleSchema = new mongoose.Schema({
    roleName: { type: String, enum: ['Admin', 'Medical_Owner', 'Sales_Person'], required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date }
  });

module.exports = mongoose.model("UserRole",UserRoleSchema);