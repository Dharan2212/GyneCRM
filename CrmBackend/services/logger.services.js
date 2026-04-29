const winston = require("winston");
const MongoDB = require("winston-mongodb");
const {auditLogging} = require("./auditlogs.services");

const logger = winston.createLogger({
	transports: [
		new MongoDB.MongoDB({
			db:
				process.env.ENVIRONMENT === "Production"
					? process.env.DB_CON_STRING_PROD
					: process.env.ENVIRONMENT === "Development"
					? process.env.DB_CON_STRING_DEV
					: process.env.ENVIRONMENT === "Staging"
					? process.env.DB_CON_STRING_STAGE
					: process.env.DB_CON_STRING_DEV,
			options: {
				useUnifiedTopology: true,
			},
			collection: "errorlogs",
			format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
		}),
	],
	format: winston.format.combine(winston.format.metadata()),
	// levels: {
	//   error: 5,
	//   warn: 4,
	//   info: 3,
	//   verbose: 2,
	//   debug: 1,
	//   silly: 0,
	// },
	level: "warn",
});

function mongoLogger(level, message, dynamicValues) {
	if (level === "warn" || level === "error") {
		logger[level](message, dynamicValues);
	}
}

async function log(logLevel, serviceName, apiInputBody = null, messageInput, auditLogToggle = false, auditLogStatus = "FAILED", UserId = null, auditLogMessage = messageInput) {
	//Log Level will specify what level of log to be maintained Eg : info / warn / error
	//Service Name will specify which API or service's log is to be recorded
	//API Input Body is the request body
	//Message Input is the message that will be specified for the logs and error logs.
	//AuditLog Toggle specifies  whether audit logging for user should be done or not, by default it wil be false
	//AuditLogStatus whether the action was a success or the action failed
	//weartechUserId is the uniques user which performed the action. In cases where we dont have any weartechUserId we'll not be audit logging in real time test case
	//auditLogMessage sometimes can be different to the error messages as error messages can be technical as well which is not needed to be logged in user Audit logs
	switch (logLevel) {
		case "info":
			console.info(`${serviceName} => ${JSON.stringify(messageInput)}.`);
			break;
		case "warn":
			console.warn(`${serviceName} => ${messageInput}.`);
			break;
		case "error":
			console.error(`${serviceName} => ${messageInput}.`);
			break;
		default:
			console.info(`${serviceName} => ${messageInput}.`);
	}
	mongoLogger(logLevel, serviceName, {dataStream: {message: JSON.stringify(messageInput), apiRequestBody: apiInputBody}});

	//#region AUDIT LOGGING
	if (auditLogToggle) {
		const auditLogEvent = {
			eventTime: new Date(),
			eventType: serviceName,
			eventStatus: auditLogStatus,
			eventResponse: [auditLogMessage],
			eventData: apiInputBody,
		};
		await auditLogging(UserId, auditLogEvent);
	}
	//#endregion AUDIT LOGGING

	return;
}

module.exports = {
	logger,
	mongoLogger,
	log,
};
