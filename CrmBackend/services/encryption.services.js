//#region IMPORTS
const crypto = require("crypto");
const { LOGLEVEL, API_NAMES } = require("../constant/constants");
const { log } = require("./logger.services");
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV = Buffer.from(process.env.ENCRYPTION_IV, "hex");
//#endregion IMPORTS


//#region ENCRYPT FUNCTION
const ENCRYPT = (data) => {
    try {
        const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), IV);
        let Encrypted = cipher.update(data, "utf8", "hex");
        Encrypted += cipher.final("hex");
        return Encrypted;
    }
    catch (error) {
        log(LOGLEVEL.ERROR, API_NAMES.ENCRYPTION, data, error);
    };
};
//#endregion ENCRYPT FUNCTION


//#region DECRYPT FUNCTION
const DECRYPT = (data) => {
    try {
        const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), IV);
        let Decrypted = decipher.update(data, "hex", "utf8");
        Decrypted += decipher.final("utf8");
        return Decrypted;
    }
    catch (error) {
        log(LOGLEVEL.ERROR, API_NAMES.DECRYPTION, data, error);
    };
};
//#endregion DECRYPT FUNCTION


//#region EXPORTS
module.exports = {
    ENCRYPT,
    DECRYPT,
};
//#endregion EXPORTS
