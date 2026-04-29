const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};
db.mongoose = mongoose;
// db.Admin = require("./Admin.model");
 
// db.DeliveryProgress = require("./DeliveryProgress.model");

db.Logs = require("./logs.model");
db.User = require("./User.model");
db.UserRole = require("./UserRole.model");
module.exports = db;