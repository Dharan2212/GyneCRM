//# Import  required files
const mongoose = require('mongoose');
const User = require('../../models/User.model');
const   { mailSender }   = require('../../services/mailSender.services');
const Profile = require('../../models/Profile.model');
const { userAckEnrollmentEmail } = require('../../mailTemplate/userAckEnrollment');
const UserRole = require('../../models/UserRole.model');
const {log}=require('../../services/logger.services');
const { API_MESSAGES, API_NAMES, LOGLEVEL, STATUS, APICODES, USER_ROLES } = require("../../constant/constants");
require('dotenv').config();

// Create User
exports.createUser = async (req, res) => {
  const {
    FullName,
    useremail,
    Phone_number,
    Party_Name,
    Gst_No,
    Address,
    LandMark,
    District,
    State,
    Role,
    Drug_License_No,
    License_Valid_Till,
    licence,
  } = req.body;

  try {
    // Validate common required fields
    if (!FullName || !useremail || !Phone_number || !Role) {
      return res.status(400).json({
        success: false,
        message: 'FullName, useremail, Phone_number, and Role are required.',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ Phone_number });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists. Please log in to continue.',
      });
    }

    // Fetch and validate Role
    const userRole = await UserRole.findOne({ roleName: Role });
    if (!userRole) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Role provided.',
      });
    }

    // Role-specific validations
    if (Role === 'Medical_Owner') {
      if (!Party_Name || !Address || !District || !State || !Drug_License_No || !License_Valid_Till) {
        return res.status(400).json({
          success: false,
          message: 'All Medical_Owner-specific fields are required.',
        });
      }
    } else if (Role === 'Sales_Person') {
      return res.status(400).json({
        success: false,
        message: 'Licence is required for Sales_Person.',
      });
    }

    // Create profile
    const profileDetails = await Profile.create({
      Owner_gender: null,
      Owner_dateOfBirth: null,
      about: null,
      alternateMobNumber: null,
    });

    // Construct user data
    const userData = {
      FullName,
      useremail,
      Phone_number,
      Role,
      Address,  //address field
      District, //district field
      State, 
      additional_detail: profileDetails._id,
    };

    // Add Role-specific fields
    if (Role === 'Medical_Owner') {
      userData.Party_Name = Party_Name;
      userData.Gst_No = Gst_No;
      userData.Address = Address;
      userData.LandMark = LandMark;
      userData.District = District;
      userData.State = State;
      userData.Licence_Details = {
        Drug_License_No,
        License_Valid_Till,
      };
      userData.approved = false; // Approval required for Medical_Owner
    } else if (Role === 'Sales_Person') {
      userData.licence = licence;
      userData.Address = Address;    
      userData.District = District;
      userData.State = State;
      userData.status = "active";
    }   

    // Create user
    const user = await User.create(userData);

   // Send acknowledgment email
    // const messageHtml = userAckEnrollmentEmail(FullName, Role === 'Medical_Owner' ? Party_Name : useremail);
    // await mailSender(
    //   useremail,
    //   'Welcome to OKA - Registration Successful. Now You Can Login Using Your Mobile Number',
    //   messageHtml
    // );
    // console.log('Email sent successfully:', messageHtml);

    // return res.status(200).json({
    //   success: true,
    //   user,
    //   message: `${Role} User created successfully.`,
    // });

       // Generate and send email
       try {
        const messageHtml = userAckEnrollmentEmail(
          FullName,
          Role === 'Medical_Owner' ? Party_Name : useremail
        );
  
        if (!messageHtml) {
          throw new Error("Email template returned empty content");
        }
  
        await mailSender(
          useremail,
          'Welcome to OKA - Registration Successful. Now You Can Login Using Your Mobile Number',
          messageHtml
        );
  
        console.log('Email sent successfully to:', useremail);
      } catch (emailError) {
        console.error('Error sending email:', emailError.message);
        // Optional: notify admin or continue silently
      }
  
      return res.status(200).json({
        success: true,
        user,
        message: `${Role} User created successfully.`,
      });
  
    
  } catch (error) {
    console.error('Error during creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during user registration. Please try again.',
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      FullName,
      useremail,
      Phone_number,
      Party_Name,
      Gst_No,
      Address,
      LandMark,
      District,
      State,
      Drug_License_No,
      License_Valid_Till,
      licence,
      status,
    } = req.body;

    const id = req.params.id;

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update user fields based on role
    if (user.Role === 'Medical_Owner') {
      Object.assign(user, {
        FullName,
        useremail,
        Phone_number,
        Party_Name,
        Gst_No,
        Address,
        LandMark,
        District,
        State,
        status,
        Licence_Details: {
          Drug_License_No,
          License_Valid_Till,
        },
      });
    } else if (user.Role === 'Sales_Person') {
      Object.assign(user, {
        FullName,
        useremail,
        Phone_number,
        licence,
        status,
        Address,
        District,
        State,
      });
    }

    // Update and save the profile
    const profile = await Profile.findById(user.additional_detail);
    if (profile) {
      profile.Owner_dateOfBirth = req.body.Owner_dateOfBirth || profile.Owner_dateOfBirth;
      profile.about = req.body.about || profile.about;
      profile.contactNumber = req.body.contactNumber || profile.contactNumber;
      profile.Owner_gender = req.body.Owner_gender || profile.Owner_gender;
      await profile.save();
    }

    // Save user
    await user.save();

    const updatedUser = await User.findById(id).populate('additional_detail');
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error during updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during profile update.',
    });
  }
};

// Get User Details
exports.getUserDetails = async (req, res) => {
  try {
    const id = req.params.id;
    const userDetails = await User.findById(id).populate('additional_detail');
    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'User details fetched successfully.',
      data: userDetails,
    });
  } catch (error) {
    console.error('Error during fetching user details:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching user details.',
    });
  }
};

// Delete User
exports.deleteAccount = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete associated profile
    await Profile.findByIdAndDelete(user.additional_detail);

    // Delete user
    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    console.error('Error during deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during user deletion.',
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('additional_detail');
    return res.status(200).json({
      success: true,
      message: 'Users fetched successfully.',
      data: users,
    });
  } catch (error) {
    console.error('Error during fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users.',
    });
  }
};
exports.getMedicalOwners = async (req, res) => {
  try {
    const medicalOwners = await User.find({ Role: 'Medical_Owner' }).populate('additional_detail');
    return res.status(200).json({
      success: true,
      message: 'Medical Owners fetched successfully.',
      data: medicalOwners,
    });
  } catch (error) {
    console.error('Error during fetching medical owners:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching medical owners.',
    });
  }
};
exports.getMedicalOwnersbyId=async(req,res)=>{
  try{
    const id=req.params.id;
    const medicalOwner=await User.findById(id).populate('additional_detail');
       // Ensure salesPerson exists and has the correct role
       if (!medicalOwner || medicalOwner.Role !== "Medical_Owner") {
        return res.status(404).json({
          success: false,
          message: 'Medical Owner not found',
        });
      }
    
    return res.status(200).json({
      success: true,
      message: 'Medical Owner fetched successfully.',
      data: medicalOwner,
    });
    
}catch (e) {
  console.error('Error during fetching medical owner:', error);
  return res.status(500).json({
    success: false,
    message: 'An error occurred while fetching medical owner.',
  });
}
}
exports.getSalesPersons = async (req, res) => {
  try {
    const salesPersons = await User.find({ Role: 'Sales_Person' }).populate('additional_detail');
    if(!salesPersons){
      return res.status(404).json({
        success: false,
        message: 'Sales Persons not found',
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Sales Persons fetched successfully.',
      data: salesPersons,
    });
  } catch (error) {
    console.error('Error during fetching sales persons:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching sales persons.',
    });
  }
};
exports.getSalesPersonById = async (req, res) => {
  try {
    const id = req.params.id;
    
    // Fetch the user with additional details
    const salesPerson = await User.findById(id).populate('additional_detail');

    // Ensure salesPerson exists and has the correct role
    if (!salesPerson || salesPerson.Role !== "Sales_Person") {
      return res.status(404).json({
        success: false,
        message: 'Sales Person not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Sales Person fetched successfully.',
      data: salesPerson,
    });

  } catch (error) {
    console.error('Error during fetching sales person:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching sales person.',
    });
  }
};

exports.approveMedicalOwner = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User
      .findById(id)
      .populate('additional_detail');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    if (user.Role !== 'Medical_Owner') {
      return res.status(400).json({
        success: false,
        message: 'User is not a Medical Owner',
      });
    }
    user.approved = true;
    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Medical Owner approved successfully.',
      data: user,
    });
  }
  catch (error) {
    console.error('Error during approving medical owner:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while approving medical owner.',
    });
  }
}
 

exports.updateUserRole = async (req, res) => {
  try {
    const { id, Role } = req.body;
    const user = await
      User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    const userRole = await UserRole.findOne({ roleName: Role });
    if (!userRole) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Role provided.',
      });
    }
    user.role = Role;
    await user.save();
    return res.status(200).json({
      success: true,
      message: 'User role updated successfully.',
    });
  }
  catch (error) {
    console.error('Error during updating user role:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating user role.',
    });
  }
}
// enum: ["active", "inactive", "blocked"],
exports.updateUserStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["active", "inactive", "blocked"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Allowed values: "active", "inactive", "blocked".',
      });
    }

    // Find and update user
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: `User status updated to "${status}" successfully.`,
      data: user,
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating user status.',
    });
  }
};


 
 
         
        
           
           