//#region  
const { log } = require("../../services/logger.services");
const { APICODES, LOGLEVEL, API_NAMES } = require("../../constant/constants");
const { cashOnOrderSchema } = require("../schema/order.schema");
//#endregion IMPORTS

module.exports = {
	//#region CASH ON ORDER VALIDATION
	CodValidation: async (req, res, next) => {
		const response = cashOnOrderSchema.validate(req.body);
		if (response.error) {
			const message = `${response.error.details[0].message.replace(`\"`, ``).replace(`\"`, ``).toString()}`;
			res.status(400).send({ Code: APICODES.VALIDATION_ERROR, message: message });
			log(LOGLEVEL.ERROR, API_NAMES.CREATE_ORDER_API, req.body, message);
			return;
		} else {
			next();
		}
	},
    
	//#endregion CASH ON ORDER VALIDATION
};
