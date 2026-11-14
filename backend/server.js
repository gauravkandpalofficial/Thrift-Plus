const cors = require("cors");

const express = require("express");

const app = express();
const PORT = 5000;

// Import product routes
const productRoutes = require("./routes/productRoutes");

const pool = require("./config/db");

app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173"
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

// Start server
app.listen(PORT, () => {
  console.log(`Thrift+ backend running at http://localhost:${PORT}`);
});
