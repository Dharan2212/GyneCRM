const multer = require("multer");

const storage=multer.memoryStorage()
// Middleware responsible to read form data and upload the File object to the mentioned path
const upload = multer({
    storage: storage,
    limits: { fileSize: 100000000000}, // Limit file size to 2 MB
    fileFilter: (req, file, cb) => {
      const allowedTypes =["application/pdf", "image/jpeg","image/jpg","image/png"];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
      } else {
        cb(new Error('Invalid file type. Only PDF files are allowed.')); // Reject the file
      }
    },
  });
module.exports = upload;
