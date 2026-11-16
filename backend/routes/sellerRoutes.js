const express = require("express");

const router = express.Router();
const pool = require("../config/db");
const { requireRole } = require("../middleware/authMiddleware");

const allowedCategories = new Set([
  "Shirts",
  "T-Shirts",
  "Jeans",
  "Shorts",
  "Jackets",
]);
const allowedGenders = new Set(["Men", "Women", "Unisex"]);
const allowedConditions = new Set(["Like New", "Very Good", "Good", "Fair"]);
const allowedRequestFields = new Set([
  "name",
  "description",
  "category",
  "gender",
  "size",
  "condition",
  "brand",
  "images",
  "price",
]);
const maximumImages = 5;

// GET /api/seller/products
// Return only the listings owned by the seller in the authenticated session.
router.get("/products", requireRole("seller"), async (req, res) => {
  const sellerId = req.session.user.id;

  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.seller_id,
         p.name,
         p.description,
         p.category,
         p.gender,
         p.size,
         p.brand,
         p.price,
         p.condition,
         p.image_url AS image,
         COALESCE(
           (
             SELECT array_agg(pi.image_url ORDER BY pi.id)
             FROM product_images pi
             WHERE pi.product_id = p.id
           ),
           array_remove(ARRAY[p.image_url], NULL)
         ) AS images,
         p.review_status,
         p.approved_min_price,
         p.approved_max_price,
         p.status,
         p.created_at,
         latest_review.decision AS latest_review_decision,
         latest_review.condition_grade AS review_condition_grade,
         latest_review.min_price AS review_min_price,
         latest_review.max_price AS review_max_price,
         latest_review.created_at AS reviewed_at
       FROM products p
       LEFT JOIN LATERAL (
         SELECT decision, condition_grade, min_price, max_price, created_at
         FROM product_reviews
         WHERE product_id = p.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       ) AS latest_review ON true
       WHERE p.seller_id = $1
       ORDER BY p.created_at DESC`,
      [sellerId]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      products: result.rows,
    });
  } catch (error) {
    console.error("Error fetching seller products:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch your products.",
    });
  }
});

// POST /api/seller/products
router.post("/products", requireRole("seller"), async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Product details must be sent as a JSON object.",
    });
  }

  // Reject unknown fields so clients cannot set ownership or workflow values.
  const unsupportedField = Object.keys(body).find(
    (field) => !allowedRequestFields.has(field)
  );
  if (unsupportedField) {
    return res.status(400).json({
      success: false,
      message: `The field '${unsupportedField}' cannot be submitted.`,
    });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 150) {
    return res.status(400).json({
      success: false,
      message: "Name is required and must be no more than 150 characters.",
    });
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
    return res.status(400).json({
      success: false,
      message: "Description must be text.",
    });
  }
  const description = typeof body.description === "string" ? body.description.trim() || null : null;

  if (typeof body.category !== "string" || !allowedCategories.has(body.category)) {
    return res.status(400).json({
      success: false,
      message: "Choose a supported product category.",
    });
  }

  const gender = body.gender === undefined ? "Unisex" : body.gender;
  if (typeof gender !== "string" || !allowedGenders.has(gender)) {
    return res.status(400).json({
      success: false,
      message: "Gender must be Men, Women, or Unisex.",
    });
  }

  const size = typeof body.size === "string" ? body.size.trim() : "";
  if (!size || size.length > 30) {
    return res.status(400).json({
      success: false,
      message: "Size is required and must be no more than 30 characters.",
    });
  }

  if (typeof body.condition !== "string" || !allowedConditions.has(body.condition)) {
    return res.status(400).json({
      success: false,
      message: "Choose a supported clothing condition.",
    });
  }

  let brand = "Unbranded";
  if (body.brand !== undefined && body.brand !== null) {
    if (typeof body.brand !== "string") {
      return res.status(400).json({
        success: false,
        message: "Brand must be text.",
      });
    }
    brand = body.brand.trim() || "Unbranded";
    if (brand.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Brand must be no more than 100 characters.",
      });
    }
  }

  const priceText = typeof body.price === "number" ? String(body.price) : "";
  const decimalPlaces = priceText.includes(".") ? priceText.split(".")[1].length : 0;
  if (
    typeof body.price !== "number" ||
    !Number.isFinite(body.price) ||
    body.price < 0 ||
    body.price > 99999999.99 ||
    decimalPlaces > 2 ||
    Math.round(body.price * 100) / 100 !== body.price
  ) {
    return res.status(400).json({
      success: false,
      message: "Price must be a non-negative number with at most two decimal places.",
    });
  }

  if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > maximumImages) {
    return res.status(400).json({
      success: false,
      message: `Provide between 1 and ${maximumImages} image URLs.`,
    });
  }

  const images = [];
  for (const image of body.images) {
    if (typeof image !== "string" || image.trim().length === 0 || image.trim().length > 2048) {
      return res.status(400).json({
        success: false,
        message: "Each image must be a valid URL of at most 2048 characters.",
      });
    }

    try {
      const imageUrl = new URL(image.trim());
      if (
        !["http:", "https:"].includes(imageUrl.protocol) ||
        !imageUrl.hostname ||
        imageUrl.username ||
        imageUrl.password
      ) {
        throw new Error("Unsupported image URL.");
      }
      images.push(imageUrl.toString());
    } catch {
      return res.status(400).json({
        success: false,
        message: "Each image must be a valid HTTP or HTTPS URL.",
      });
    }
  }

  const sellerId = req.session.user.id;
  const reviewStatus = body.price < 150 ? "not_required" : "pending";
  const status = body.price < 150 ? "active" : "pending_review";
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // Ownership and workflow fields come from the session and server policy.
    const productResult = await client.query(
      `INSERT INTO products (
         seller_id, name, description, category, gender, size, brand,
         price, condition, image_url, review_status, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, seller_id, name, description, category, gender, size,
                 brand, price, condition, image_url AS image, review_status,
                 approved_min_price, approved_max_price, status, created_at`,
      [
        sellerId,
        name,
        description,
        body.category,
        gender,
        size,
        brand,
        body.price,
        body.condition,
        images[0],
        reviewStatus,
        status,
      ]
    );

    const product = productResult.rows[0];
    for (const imageUrl of images) {
      // The live product_images table requires only product_id and image_url.
      await client.query(
        "INSERT INTO product_images (product_id, image_url) VALUES ($1, $2)",
        [product.id, imageUrl]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      product: {
        ...product,
        images,
      },
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Unable to roll back product creation:", rollbackError.message);
      }
    }

    console.error("Error creating seller product:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create product right now.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
