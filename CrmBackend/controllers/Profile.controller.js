const Profile = require("../models/Profile.model")
const User = require("../models/User.model")
const { uploadImageToCloudinary } = require("../utils/imageUploader")
const mongoose = require("mongoose")
const { convertSecondsToDuration } = require("../utils/secToDuration")
 
exports.updateDisplayPicture = async (req, res) => {
  try {
    const displayPicture = req.files.displayPicture
    const userId = req.user.id
    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      1000,
      1000
    )
    console.log(image)
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    )
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

 

exports.getUserDashboard = async (req, res) => {
  try {
    const userDetails = await User.find({ phone_number: req.user.id })

    const userData = userDetails.map((user) => {
     // const totalItems = user.NoOfProduct.length
      //const totalOrders = totalOrder * userOrder.price

      // Create a new object with the additional fields
      const userDataWithStats = {
        _id: user._id,
        FirsrtName: user.FirsrtName,
        //need to work after login page
      }

      return userDataWithStats
    })

    res.status(200).json({ courses: courseData })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Server Error" })
  }
}

