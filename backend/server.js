
const express = require("express");

const app = express();
const PORT = 5000;

// Import product routes
const productRoutes = require("./routes/productRoutes");

app.use(express.json());

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

// Product routes
app.use("/api/products", productRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Thrift+ backend running at http://localhost:${PORT}`);
});
