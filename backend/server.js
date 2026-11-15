const cors = require("cors");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const app = express();
const PORT = 5000;

// Import product routes
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");

const pool = require("./config/db");

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

// Store sessions in PostgreSQL using the existing connection pool.
const isProduction = process.env.NODE_ENV === "production";
app.use(session({
  store: new pgSession({
    pool,
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
  },
}));

// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Thrift+ API",
    status: "running",
  });
});

// Health-check route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Thrift+ backend is healthy",
  });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      success: true,
      message: "Thrift+ database connected successfully",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Product routes
app.use("/api/products", productRoutes);

// Buyer and seller registration route
app.use("/api/auth", authRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Thrift+ backend running at http://localhost:${PORT}`);
});
