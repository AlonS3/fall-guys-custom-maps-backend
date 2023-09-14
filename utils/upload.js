const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif"];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, and GIF image files are allowed."
      )
    );
  }
};

const multerUpload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1 MB
    files: 3,
  },
  fileFilter: fileFilter,
});

const upload = (req, res, next) => {
  multerUpload.array("files", 3)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ error: "File Error: File Size is too large. Allowed file size is 1MB." });
      } else {
        // Handle other multer errors
        return res.status(400).json({ error: "File Error: "+err.message });
      }
    } else if (err) {
      // An unknown error occurred when uploading.
      return res.status(400).json({ error: "File Error: An unknown error occurred when uploading your files" });
    }

    // Everything went fine.
    next();
  });
};

module.exports = upload;
