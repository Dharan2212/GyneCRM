const API_MESSAGES = {
	//#region AUTHENTICATION DONE
	REGISTRATION: {
		SUCCESS: "Registration successful",
		FILE_ERROR: "Re-upload profile image",
		USER_EXISTS: "User already registered",
		DEVICE_EXISTS: "Device already registered",
		ERROR: "Registration failed",
		REQUETBODY:"Request Body from input field required",
	},
	LOGIN: {
		SUCCESS: "Login successful",
		INCORRECT_PASSWORD: "Incorrect password",
		INVALID_USER: "Invalid user",
		MAXIMUM_LOGINS_EXCEEDED: "Maximum number of logins reached. Cannot add more logins.",
		ERROR: "Login failed"
	},
	LOGOUT: {
		SUCCESS: "Logout successful",
		ERROR: "Logout failed"
	},
	FORGOT_PASSWORD: {
		SUCCESS: "Email sent on {0}",
		INVALID_USER: "Invalid user",
		ERROR: "Something went wrong, try again"
	},
	CHANGE_PASSWORD: {
		SUCCESS: "Password updated",
		INCORRECT_PASSWORD: "Incorrect old password",
		ERROR: "Something went wrong, try again"
	},
	RESET_PASSWORD: {
		SUCCESS: "Password updated",
		INVALID_USER: "Invalid user",
		ERROR: "Something went wrong, try again"
	},
	EMAIL_VERIFICATION: {
		EMAIL_SUCCESS: "Email sent on {0}",
		VERIFY_SUCCESS: "Email verified",
		INVALID_USER: "Invalid user",
		EXISTING_USER: "{0} already exists",
		ERROR: "Something went wrong, try again"
	},
	OTP_VERIFICATION:{
		OTP_SUCCESS: "OTP sent on {0}",
		OTP_VERIFY_SUCCESS: "OTP verified",
		INVALID_OTP: "Invalid OTP",
		DOES_NOT_EXISTING_CONTACT: "Does not exists contact",
		ERROR: "Something went wrong, try again"
	},

	CONTACT_US_API_MESSAGES: {
        VALIDATION_ERROR: "Validation error: Missing required fields.",
        INVALID_EMAIL: "Invalid email format.",
        CONTACT_SUBMITTED: "Contact form submitted successfully.",
        NO_CONTACTS_FOUND: "No contacts found.",
  LIST_CONTACTS_SUCCESS: "Contacts listed successfully.",
  CONTACT_NOT_FOUND: "Contact not found.",
  CONTACT_FETCHED: "Contact fetched successfully.",
  CONTACT_UPDATED: "Contact updated successfully.",
  CONTACT_DELETED: "Contact deleted successfully.",
  INTERNAL_SERVER_ERROR: "Internal server error.",
  INVALID_ID: "Invalid ID format.",
  INVALID_PAGINATION_PARAMS: "Invalid pagination parameters.",
  EMAIL_SEND_ERROR: "Failed to send email.",

	},
	 AUTHENTICATION: {
    NO_TOKEN: "Authentication token is missing.",
    INVALID_TOKEN: "Invalid or expired token.",
    VALID_TOKEN: "Token is valid.",
  },
	//#endregion AUTHENTICATION
 // #region Documentation
 UPLOAD_DOCUMENTS: {
    USER_NOT_FOUND: "User not found.",
    MISSING_DOCUMENTS: "Missing mandatory documents. Please upload all required files.",
    UPLOAD_SUCCESS: "Documents uploaded successfully.",
    UPLOAD_FAILURE: "Failed to upload documents. Please try again later.",
  },
 
  USER_DOCUMENTS: {
    NO_DOCUMENTS_FOUND: "No documents found for this user.",
    FETCH_SUCCESS: "Documents fetched successfully.",
    FETCH_ERROR: "An error occurred while fetching the documents.",
    USER_NOT_FOUND: "User not found.",
    PERMISSION_DENIED: "You don't have permission to access these documents.",
    OWNER_NO_DOCUMENTS: "No documents found for this owner.",
    OWNER_FETCH_ERROR: "An error occurred while fetching the owner's documents.",
    OWNER_FETCH_SUCCESS: "Owner's documents fetched successfully.",
  },
	//#endregion Documentations
	//#region USER DONE
	GET_USER: {
		SUCCESS: "User details updated",
		INVALID_USER: "Invalid user",
		ERROR: "Something went wrong, try again"
	},
	UPDATE_USER: {
		SUCCESS: "Profile updated",
		INVALID_USER: "Invalid user",
		ERROR: "Something went wrong, try again"
	},
	DELETE_USER: {
		SUCCESS: "User deleted",
		INVALID_USER: "Invalid user",
		NOT_FOUND: "User not found",
		ERROR: "Something went wrong, try again"
	},
	//#endregion USER

	//#region USER DATA
	CHANGE_PERMISSION: {
		SUCCESS: "Changed permission of user",
		NOT_FOUND: "User not found",
		ERROR: "Something went wrong, try again"
	},
	ASSIGN_ROLE: {
		SUCCESS: "Role assigned successfully",
		NOT_FOUND: "User not found",
		ERROR: "Something went wrong, try again"
	},
	//#endregion USER DATA
    
	//#region ADMIN SERVICES 
	ADD_ADMIN: {
		SUCCESS: "Admin Created successfully",
		NOT_FOUND: "Site not found",
		ADMIN_NOT_FOUND: "Admin user not found",
		ADMIN_ALREADY_EXIST: "An admin is already assigned to this site",
		ADMIN_MESSAGE: "THis is protected route for admin"
	},
	FETCH_STAFF_LIST: {
		SITE_NOT_FOUND: "No active user found",
		SUCCESS: "Staff list fetched successfully"
	},
	MEDICAL_LIST: {
		MEDICAL_API_MESSAGES:"This is protected by medical owner"
	},
	SALESPERSON:{
		SALESPERSON_MESSAGES:"This is protected by SALES person",
	},
	 
	//#endregion SITE

	 
	 
	 
 
	//#endregion ADMIN SERVICES

	UNAUTHORIZED: "Unauthorized",
	INVALID_USER: "Invalid user",
	ERROR: "Something went wrong, try again",
	INVALID_GEOFENCE_ID: "Invalid geofence Id",
 
};
// API Names
const API_NAMES_LOCAL = {
    CREATE_CATEGORY: "CREATE_PRODUCT_CATEGORY_API",
    FETCH_CATEGORY: "FETCH_PRODUCT_CATEGORY_API",
    CREATE_PRODUCT: "CREATE_PRODUCT_API",
    
};

// API Messages
const API_MESSAGES_LOCAL = {
   
    PRODUCT: {
        CREATE_SUCCESS: "Product created successfully",
        UPDATE_SUCCESS: "Product updated successfully",
        DELETE_SUCCESS: "Product deleted successfully",
        FETCH_SUCCESS: "Products fetched successfully",
        CREATE_ERROR: "Error occurred while creating product",
       
    },
	 
};

 
   
  
const API_NAMES = {
	//#region AUTHENTICATION APIS
	REGISTER_API: "REGISTER",
	LOGIN_API: "LOGIN",
	LOGOUT_API: "LOGOUT",
	FORGOT_PASSWORD_API: "FORGOT_PASSWORD",
	CHANGE_PASSWORD_API: "CHANGE_PASSWORD",
	RESET_PASSWORD_API: "RESET_PASSWORD",
	EMAIL_VERIFICATION_API: "EMAIL_VERIFICATION",
	DEVICE_ID_CHECK_API: "DEVICE_ID_CHECK",
	 
	//#region USER CONTROLLER APIS
	CREATE_USER_API: "CREATE_USER",
	GET_USER_API: "GET_USER",
	UPDATE_USER_API: "UPDATE_USER",
	DELETE_USER_API: "DELETE_USER",
	//#endregion USER CONTROLLER APIS
	CREATE_ORDER_API: "CREATE_ORDER",
	//#region ADMIN
	ADMIN_NOT_FOUND_API:"ADMIN_NOT_FOUND",
	 
 
	 

	//#region COMMON SERVICE
	CHECK_USER: "CHECK_USER_EXISTS_SERVICE",
	CHECK_DEVICE: "CHECK_DEVICE_EXISTS_SERVICE",
	REMOVE_FILE: "REMOVE_FILE_SERVICE",
	AUDIT_LOGS: "AUDIT_LOGGING_SERVICE",
	EMAIL: "EMAIL_SERVICE",
	ENCRYPTION: "ENCRYPTION_SERVICE",
	DECRYPTION: "DECRYPTION_SERVICE",
	ANDROID_NOTIFICATIONS: "ANDROID_NOTIFICATIONS_SERVICE",
	IOS_NOTIFICATIONS: "IOS_NOTIFICATIONS_SERVICE",
	WEB_SOCKET: "WEB_SOCKET_SERVICE",
	SETTINGS: "SETTINGS",
	REFRESH_RATE_API: "REFRESH_RATE_API",
	ASSIGN_ROLE_API: "ASSIGN_ROLE_API",
	CREATE_BLE_API: "CREATE_BLE_API",
	CHANGE_PERMISSION_API: "CHANGE_PERMISSION_API",
	VERIFY_API_KEY: "VERIFY_API_KEY",
	VERIFY_ACCESS_TOKEN: "VERIFY_ACCESS_TOKEN",
	//#endregion COMMON SERVICE 
};

const STATUS = {
	SUCCESS: "SUCCESS",
	FAILED: "FAILED"
};

const LOGLEVEL = {
	INFO: "info",
	WARN: "warn",
	ERROR: "error",
	DEBUG: "debug",
	VERBOSE: "verbose",
	SILLY: "silly"
};

const APICODES = {
	SUCCESS: "0",
	CREATED: "1",
	ERROR: "2",
	UNAUTHORIZED: "3",
	BAD_REQUEST: "4",
	VALIDATION_ERROR: "5",
	CONNECTIVITY_ERROR: "6",
	NOT_FOUND: "7",
	INTERNAL_SERVER_ERROR: "8",
	INVALID: "9"
};

const MONGO_OPERATION_TYPE = {
	INSERT: "insert",
	UPDATE: "update",
	REPLACE: "replace",
	DELETE: "delete"
};
const USER_ROLES = {
	ADMIN: "ADMIN",
	 
}; 
const PAYMENT_API_MESSAGES = {
    CREATE_ORDER: {
        SUCCESS: "Order created successfully",
        ERROR: "Error creating order. Please try again.",
        INVALID_REQUEST: "Invalid request. Missing required fields.",
    },
    UPDATE_PAYMENT_STATUS: {
        SUCCESS: "Payment status updated successfully",
        ERROR: "Error updating payment status",
        ORDER_NOT_FOUND: "Order not found",
        ALREADY_PAID: "Payment is already completed for this order",
    },
    VERIFY_PAYMENT: {
        SUCCESS: "Payment verified successfully",
        ERROR: "Error verifying payment",
        INVALID_SIGNATURE: "Invalid payment signature",
        ORDER_NOT_FOUND: "Order not found",
    },
    INITIATE_PAYMENT: {
        SUCCESS: "Payment initiated successfully",
        ERROR: "Error initiating payment",
    }
};

const PAYMENT_API_NAMES = {
    CREATE_ORDER: "CREATE_ORDER_API",
    UPDATE_PAYMENT_STATUS: "UPDATE_PAYMENT_STATUS_API",
    VERIFY_PAYMENT: "VERIFY_PAYMENT_API",
    INITIATE_PAYMENT: "INITIATE_PAYMENT_API",
};

const PAYMENT_STATUS = {
    PENDING: "pending",
    PAID: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
};
const ADDRESS_API_MESSAGES = {
	CREATE_ADDRESS: {
	  SUCCESS: "Address created successfully",
	  ERROR: "Error creating address. Please try again.",
	  INVALID_REQUEST: "Invalid request. Missing required fields.",
	},
	GET_ADDRESSES: {
	  SUCCESS: "Addresses fetched successfully",
	  ERROR: "Error fetching addresses",
	},
	GET_ADDRESS: {
	  SUCCESS: "Address fetched successfully",
	  ERROR: "Error fetching address",
	  INVALID_ID: "Invalid address ID format",
	  NOT_FOUND: "Address does not exist",
	},
	UPDATE_ADDRESS: {
	  SUCCESS: "Address updated successfully",
	  ERROR: "Error updating address",
	  NOT_FOUND: "Address does not exist",
	},
	DELETE_ADDRESS: {
	  SUCCESS: "Address deleted successfully",
	  ERROR: "Error deleting address",
	  NOT_FOUND: "Address does not exist",
	},
  };
  
  const ADDRESS_API_NAMES = {
	CREATE_ADDRESS: "CREATE_ADDRESS_API",
	GET_ADDRESSES: "GET_ALL_ADDRESSES_API",
	GET_ADDRESS: "GET_ADDRESS_BY_ID_API",
	UPDATE_ADDRESS: "UPDATE_ADDRESS_API",
	DELETE_ADDRESS: "DELETE_ADDRESS_API",
  };
 
module.exports = {
	API_MESSAGES,
	API_NAMES,
	STATUS,
	LOGLEVEL,
	APICODES,
	MONGO_OPERATION_TYPE, 
	USER_ROLES,
	API_MESSAGES_LOCAL,
	API_NAMES_LOCAL,
	 
};
