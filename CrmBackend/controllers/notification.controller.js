const Notification = require("../models/Notification.model"); // Adjust path as needed

// Create a new notification
exports.createNotification = async (req, res) => {
  try {
    const { order, address, totalAmount, message, date } = req.body;

    const newNotification = new Notification({
      order,
      address,
      totalAmount,
      message,
      date,
    });

    await newNotification.save();

    res.status(201).json({
      status: true,
      message: "Notification created successfully",
      data: newNotification,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// Update an existing notification
exports.updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedNotification = await Notification.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true, // Return updated document
        runValidators: true, // Ensure validation rules are applied
      }
    );

    if (!updatedNotification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Notification updated successfully",
      data: updatedNotification,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedNotification = await Notification.findByIdAndDelete(id);

    if (!deletedNotification) {
      return res.status(404).json({
        status: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Notification deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

// Get all notifications with pagination
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default pagination values
    const notifications = await Notification.find()
      .sort({ date: -1 }) // Sort by most recent
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalCount = await Notification.countDocuments();

    res.status(200).json({
      status: true,
      message: "Notifications fetched successfully",
      data: notifications,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getNotificationsByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      filter.date = { $lte: new Date(endDate) };
    }

    const notifications = await Notification.find(filter).sort({ date: -1 });

    res.status(200).json({
      status: true,
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
