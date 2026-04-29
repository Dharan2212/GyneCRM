const { contactUsEmail } = require("../mailTemplate/contactFormRes");
const { mailSender1 }= require("../services/mailSender.services");
const Contact = require('../models/ContactUs.model'); // Ensure the file name matches
const { log } = require("../services/logger.services");
const { API_MESSAGES, APICODES, LOGLEVEL, API_NAMES, STATUS } = require("../constant/constants");

exports.contactUsController = async (req, res) => {
  const { firstName, lastName, email, phoneNumber, interestedToSignUpAs, yourMedicalName, additionalInformation } = req.body;

  try {
      // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "All fields (firstName, lastName, email, phoneNumber) are required.",
      });
    }

    // Validate email format (basic check)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    // Save data to database
    const contactData = new Contact({
      firstName,
      lastName,
      email,
      phoneNumber,
      interestedToSignUpAs: interestedToSignUpAs || '', // Optional
      yourMedicalName: yourMedicalName || '', // Optional
      additionalInformation: additionalInformation || '', // Optional
    });

    await contactData.save();

    // Send email
    const emailRes = await mailSender1(
      email,
      "New website enquiry",
      contactUsEmail(email, firstName, lastName, additionalInformation, phoneNumber, interestedToSignUpAs || yourMedicalName)
    );

    // Log success
    log({
      level: LOGLEVEL.INFO,
      message: `Contact form submitted and email sent for ${email}`,
      status: STATUS.SUCCESS,
    });

    return res.status(200).json({
      success: true,
      message: "Form submitted and email sent successfully",
      data: contactData,
    });
  } catch (error) {
    // Log error for debugging
    log({
      level: LOGLEVEL.ERROR,
      message: `Error in contactUsController: ${error.message}`,
      status: STATUS.FAILURE,
      error: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
       
    });
  }
};

exports.getAllContacts = async (req, res) => {
  const { page = 1, limit = 10 } = req.query; // Pagination parameters with defaults

  try {
    // Validate pagination parameters
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedPage) || isNaN(parsedLimit) || parsedPage < 1 || parsedLimit < 1) {
      return res.status(400).send({
        Code: APICODES.BAD_REQUEST,
        message: API_MESSAGES.CONTACT_US_API_MESSAGES.INVALID_PAGINATION_PARAMS,
        data: null,
      });
    }

    const contacts = await Contact.find()
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    if (!contacts || contacts.length === 0) {
      return res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.CONTACT_US_API_MESSAGES.NO_CONTACTS_FOUND,
        data: null,
      });
    }

    log(
      LOGLEVEL.INFO,
      API_NAMES.LIST_CONTACTS,
      { page: parsedPage, limit: parsedLimit },
      API_MESSAGES.CONTACT_US_API_MESSAGES.LIST_CONTACTS_SUCCESS,
      true,
      STATUS.SUCCESS
    );

    return res.status(200).send({
      Code: APICODES.SUCCESS,
      message: API_MESSAGES.LIST_CONTACTS_SUCCESS,
      data: contacts,
    });
  } catch (error) {
    log(
      LOGLEVEL.ERROR,
      API_NAMES.LIST_CONTACTS,
      { page, limit, error: error.message },
      API_MESSAGES.CONTACT_US_API_MESSAGES.INTERNAL_SERVER_ERROR,
      false,
      STATUS.FAILED
    );

    return res.status(500).send({
      Code: APICODES.FAILURE,
      message: API_MESSAGES.CONTACT_US_API_MESSAGES.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};

// Fetch Contact by ID
exports.getContactById = async (req, res) => {
  const { id } = req.params;

  try {
    // Validate ID format (assuming MongoDB ObjectId)
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send({
        Code: APICODES.INVALID,
        message: API_MESSAGES.CONTACT_US_API_MESSAGES.INVALID_ID,
        data: null,
      });
    }

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).send({
        Code: APICODES.INVALID,
        message: API_MESSAGES.CONTACT_US_API_MESSAGES.CONTACT_NOT_FOUND,
        data: null,
      });
    }

    log(
      LOGLEVEL.INFO,
      API_NAMES.GET_CONTACT,
      { id },
      API_MESSAGES.CONTACT_US_API_MESSAGES.CONTACT_FETCHED,
      true,
      STATUS.SUCCESS
    );

    return res.status(200).send({
      Code: APICODES.SUCCESS,
      message: API_MESSAGES.CONTACT_US_API_MESSAGES.CONTACT_FETCHED,
      data: contact,
    });
  } catch (error) {
    log(
      LOGLEVEL.ERROR,
      API_NAMES.GET_CONTACT,
      { id, error: error.message },
      API_MESSAGES.CONTACT_US_API_MESSAGES.INTERNAL_SERVER_ERROR,
      false,
      STATUS.FAILED
    );

    return res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.CONTACT_US_API_MESSAGES.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};

 
 

// Delete Contact by ID
exports.deleteContactById = async (req, res) => {
  const { id } = req.params;

  try {
    // Validate ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).send({
        Code: APICODES.INVALID,
        message: API_MESSAGES.CONTACT_US_API_MESSAGES.INVALID_ID,
        data: null,
      });
    }

    const deletedContact = await Contact.findByIdAndDelete(id);

    if (!deletedContact) {
      return res.status(404).send({
        Code: APICODES.NOT_FOUND,
        message: API_MESSAGES.CONTACT_US_API_MESSAGES.CONTACT_NOT_FOUND,
        data: null,
      });
    }

    log(
      LOGLEVEL.INFO,
      API_NAMES.DELETE_CONTACT,
      { id },
      API_MESSAGES.CONTACT_US_API_MESSAGES.CONTACT_DELETED,
      true,
      STATUS.SUCCESS
    );

    return res.status(200).send({
      Code: APICODES.SUCCESS,
      message: API_MESSAGES.CONTACT_US_API_MESSAGES.CONTACT_DELETED,
      data: deletedContact,
    });
  } catch (error) {
    log(
      LOGLEVEL.ERROR,
      API_NAMES.DELETE_CONTACT,
      { id, error: error.message },
      API_MESSAGES.CONTACT_US_API_MESSAGES.INTERNAL_SERVER_ERROR,
      false,
      STATUS.FAILED
    );

    return res.status(500).send({
      Code: APICODES.INTERNAL_SERVER_ERROR,
      message: API_MESSAGES.CONTACT_US_API_MESSAGES.INTERNAL_SERVER_ERROR,
      data: null,
    });
  }
};