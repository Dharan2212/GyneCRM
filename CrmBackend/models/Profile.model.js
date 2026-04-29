const mongoose = require("mongoose");

// Define the Profile schema
const profileSchema = new mongoose.Schema({
	Owner_gender: {
		type: String,
	},
	Owner_dateOfBirth: {
		type: String,
	},
	about: {
		type: String,
		trim: true,
	},
	alternateMobNumber: {
		type: Number,
		trim: true,
	},
});

// Export the Profile model
module.exports = mongoose.model("Profile", profileSchema);
