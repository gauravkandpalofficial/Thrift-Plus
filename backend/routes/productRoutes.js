
const express = require("express");
const router = express.Router();

const products = require("../data/products");

// GET: Fetch all products
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    count: products.length,
    products: products,
  });
});

// GET: Fetch a single product by ID
router.get("/:id", (req, res) => {
  const productId = Number(req.params.id);

  const product = products.find(
    (item) => item.id === productId
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  res.status(200).json({
    success: true,
    product: product,
  });
});

module.exports = router;
