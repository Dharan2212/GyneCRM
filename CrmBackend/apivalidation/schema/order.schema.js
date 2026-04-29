//#region IMPORTS
const Joi = require("joi");
//#endregion IMPORTS

const schema = {
    //#region ORDER VALIDATION SCHEMA
    cashOnOrderSchema: Joi.object({
        userId: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .message("Invalid userId (must be a valid ObjectId).")
            .required(),

        // shippingAddressId: Joi.string()
        //     .pattern(/^[0-9a-fA-F]{24}$/)
        //     .message("Invalid shippingAddressId (must be a valid ObjectId).")
        //     .required(),

        discountAmount: Joi.number()
            .min(0)
            .message("Invalid discountAmount (must be a non-negative number).")
            .default(0),

        shippingAmount: Joi.number()
            .min(0)
            .message("Invalid shippingAmount (must be a non-negative number).")
            .default(0),
    }).unknown(false)
    //#endregion ORDER VALIDATION SCHEMA
};

module.exports = schema;
