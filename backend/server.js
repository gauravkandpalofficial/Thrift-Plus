
const express = require("express");

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Thrift+ API",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Thrift+ backend is healthy",
  });
});

app.listen(PORT, () => {
  console.log(`Thrift+ backend running at http://localhost:${PORT}`);
});
