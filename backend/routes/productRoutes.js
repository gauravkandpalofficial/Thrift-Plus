const express = require("express");
const router = express.Router();

const pool = require("../config/db");

// Return database columns in a shape the frontend already understands.
// image_url AS image keeps the photo URL in PostgreSQL, but sends it as "image" in JSON.
const productSelect = `
  SELECT
    id,
    seller_id,
    name,
    description,
    category,
    gender,
    brand,
    price,
    condition,
    image_url AS image,
    review_status,
    approved_min_price,
    approved_max_price,
    status,
    created_at
  FROM products
`;

// GET: Fetch all products from PostgreSQL
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `${productSelect} ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      products: result.rows,
    });

  } catch (error) {
    console.error("Error fetching products:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch products",
    });
  }
});


// GET: Fetch a single product by ID from PostgreSQL
router.get("/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const result = await pool.query(
      `${productSelect} WHERE id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product: result.rows[0],
    });

  } catch (error) {
    console.error("Error fetching product:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch product",
    });
  }
});

module.exports = router;
