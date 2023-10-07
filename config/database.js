const mongoose = require("mongoose")
require("dotenv/config")

module.exports = () => {
  return mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((x) => {
      console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`)
      return mongoose
    })
    .catch((err) => {
      console.error("Error connecting to mongo")
      throw err
    })
}
