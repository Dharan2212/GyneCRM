//#region IMPORTS
const logsModel = require("../models/logs.model");
//#endregion IMPORTS


//#region AUDIT LOGGING
async function auditLogging(UserId, event) {
    try {
        const currentDate = new Date();
        const existingLogDocument = await logsModel.findOne({
            UserId,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        });
        if (existingLogDocument) {
            existingLogDocument.events.push(event);
            await existingLogDocument.save().catch(error => {
                console.error(`AUDIT LOGS => ${JSON.stringify(error)}`);
            });
        } else if (!existingLogDocument) {
            currentDate.setHours(0, 0, 0, 0); // Set to 00:00:00.000
            const newLogDocument = new logsModel({
                UserId,
                events: [event],
                startDate: currentDate,
                endDate: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000), // 24 hours later,
                createdAt: new Date()
            });
            await newLogDocument.save().catch(error => {
                console.error(`AUDIT LOGS => ${JSON.stringify(error)}`);
            });
        };
    }
    catch (error) {
        console.error(`AUDIT LOGS => ${JSON.stringify(error)}`);
    };
    return;
};
//#endregion AUDIT LOGGING


//#region EXPORTS
module.exports = {
    auditLogging
};
//#endregion EXPORTS