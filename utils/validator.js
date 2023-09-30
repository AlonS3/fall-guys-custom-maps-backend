const Joi = require("joi")
Joi.objectId = require("joi-objectid")(Joi)

const validator = (schema) => (payload) => schema.validate(payload)

const createMapSchema = Joi.object({
  title: Joi.string().min(6).max(45).required(),
  description: Joi.string().min(6).max(700).required(),
  code: Joi.string()
    .required()
    .pattern(/^[0-9]{4}-[0-9]{4}-[0-9]{4}$/)
    .message("Invalid map code format. Please use the format: xxxx-xxxx-xxxx"),
  category: Joi.string().valid("Casual", "Art", "Challenge").required(),
}).unknown(false)

const updateMapSchema = Joi.object({
  title: Joi.string().min(1).optional(),
  description: Joi.string().optional(),
  category: Joi.string().valid("Casual", "Art", "Challenge").optional(),
  images: Joi.array().items(Joi.string()).optional(),
})
  .min(1)
  .unknown(false)

const mapParamsSchema = Joi.object({
  mapId: Joi.objectId().required(),
}).unknown(false)

const updateUserInformationSchema = Joi.object({
  nickname: Joi.string().min(1).optional(),
  status: Joi.string().optional(),
})
  .min(1)
  .unknown(false)

const userParamsSchema = Joi.object({
  userId: Joi.objectId().required(),
}).unknown(false)

const mapQuerySchema = Joi.object({
  category: Joi.string().valid("All", "Casual", "Art", "Challenge").optional(), // Replace with your actual categories
  query: Joi.string().allow("").optional(),
  page: Joi.number().integer().min(1).optional(),
  sort: Joi.string().valid("dateAdded", "popularity").optional(),
  userId: Joi.objectId().optional(),
}).unknown(false)

exports.validateCreateMap = validator(createMapSchema)
exports.validateUpdateMap = validator(updateMapSchema)
exports.validateMapIdParams = validator(mapParamsSchema)
exports.validateUpdateUserInformation = validator(updateUserInformationSchema)
exports.validateUserIdParams = validator(userParamsSchema)
exports.validateMapQuery = validator(mapQuerySchema)
