const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    eventTime: Date,
    eventType: String,
    eventStatus: String,
    eventResponse: [String],
    eventData:{}
}, {
    _id: false, // Exclude the _id field from the subdocument
    versionKey: false
})

const userLogsSchema = new mongoose.Schema({
    UserId: String,
    startDate: Date,
    endDate: Date,
    error: Boolean,
    status: String,
    events: [eventSchema],
    createdAt: Date
}, {
    versionKey: false // Disable the version key "__v"
});

module.exports = mongoose.model("Userlogs", userLogsSchema);
