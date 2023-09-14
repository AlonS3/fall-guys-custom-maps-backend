const express = require("express");
const cors = require('cors')
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const db = require("./config/database");
const errorHandler = require("./middlewares/errorHandler");
const publicRoutes = require("./routes/publicRoutes");
const authenticatedRoutes = require("./routes/authenticatedRoutes");

require("dotenv/config");

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Locale,Cache-Control',
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// routes
app.use("/api/public", publicRoutes);
app.use("/api", authenticatedRoutes);


// database connection
db();

// error handling
app.use(errorHandler);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Running app on port ${process.env.PORT || "3000"}`);
});
