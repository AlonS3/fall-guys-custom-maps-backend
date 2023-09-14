const sharp = require("sharp")

const optimizeImages = async (files) => {
  return await Promise.all(
    files.map(async (file) => {
      const optimizedBuffer = await sharp(file.buffer)
        .resize(720, 404, { fit: "cover", position: "centre" }) // Adjust as required.
        .jpeg({ quality: 70 })
        .toBuffer()

      return {
        ...file,
        buffer: optimizedBuffer,
        mimetype: "image/jpeg",
      }
    })
  )
}

module.exports = optimizeImages
