const express = require("express")
const cors = require("cors")
const app = express()
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
const db = require("./config/database")
const errorHandler = require("./middlewares/errorHandler")
const publicRoutes = require("./routes/publicRoutes")
const authenticatedRoutes = require("./routes/authenticatedRoutes")
require("dotenv/config")

const passport = require("./config/passport-google-strategies")

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Locale,Cache-Control",
}
app.use(cors(corsOptions))

// session
const session = require("express-session")
const MongoStore = require("connect-mongo")

// database connection
db()

const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: "sessions", // Optional. Use whatever you prefer.
  touchAfter: 60 * 60 * 24, //  the session's expires field in the database can be updated at most once every day
  stringify: false,
})

app.use(
  session({
    secret: process.env.jwt_secret_key, // Choose a strong secret in production
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    rolling: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 14, // 2 days
      httpOnly: true,
      // secure: true, // Uncomment this when deploying with HTTPS
    },
  })
)

app.use(passport.initialize())
// app.use(passport.session())

// routes
app.use("/api/public", publicRoutes)
app.use("/api", authenticatedRoutes)

// error handling
app.use(errorHandler)

app.listen(process.env.PORT || 3000, () => {
  console.log(`Running app on port ${process.env.PORT || "3000"}`)
})
