// s3
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3")
const { v4: uuidv4 } = require("uuid")
require("dotenv/config")

const s3 = new S3Client({ region: process.env.BUCKET_REGION })

exports.uploadToS3 = async (files) => {
  const params = files.map((file) => {
    const uniqueName = `${uuidv4()}.${file.mimetype.split("/")[1]}` // Generate a unique name with UUID.

    return {
      Bucket: process.env.BUCKET_NAME,
      Key: uniqueName, // Use the unique name
      Body: file.buffer,
      ContentType: file.mimetype,
    }
  })

  const s3Results = await Promise.allSettled(
    params.map((param) => {
      const command = new PutObjectCommand(param)
      return s3.send(command)
    })
  )

  const successfulUploads = s3Results.map((result, index) => (result.status === "fulfilled" ? params[index].Key : null)).filter((key) => key !== null)

  return successfulUploads // Return both the results and the params for further processing.
}

exports.rollbackS3Uploads = async (keys) => {
  const deletePromises = keys.map((key) => {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
    })
    return s3.send(deleteCommand)
  })

  try {
    await Promise.all(deletePromises)
    return true
  } catch (err) {
    console.error("Error deleting images from S3:", err)
    return false
  }
}
