const express = require("express");

const router = express.Router();
const pool = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const allowedApprovalFields = new Set(["minPrice", "maxPrice", "reviewerNotes"]);
const allowedRejectionFields = new Set(["reviewerNotes"]);
const maximumPrice = 99999999.99;
const maximumReviewerNotesLength = 2000;

function hasAtMostTwoDecimalPlaces(value) {
  const [coefficient, exponentText] = String(value).toLowerCase().split("e");
  const decimalPlaces = (coefficient.split(".")[1] || "").length;
  const exponent = exponentText ? Number(exponentText) : 0;
  return Math.max(0, decimalPlaces - exponent) <= 2;
}

function isValidApprovedPrice(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= maximumPrice &&
    hasAtMostTwoDecimalPlaces(value)
  );
}

// GET /api/reviewer/products
// Reviewers can inspect pending listings but this endpoint does not modify them.
router.get("/products", requireAuth, requireRole("reviewer"), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.description,
         p.category,
         p.gender,
         p.size,
         p.brand,
         p.condition,
         p.price,
         p.status,
         p.review_status,
         p.created_at,
         COALESCE(
           (
             SELECT array_agg(pi.image_url ORDER BY pi.id)
             FROM product_images pi
             WHERE pi.product_id = p.id
           ),
           array_remove(ARRAY[p.image_url], NULL)
         ) AS images,
         json_build_object(
           'id', seller.id,
           'full_name', seller.full_name
         ) AS seller
       FROM products p
       JOIN users seller ON seller.id = p.seller_id
       WHERE p.status = 'pending_review'
         AND p.review_status = 'pending'
       ORDER BY p.created_at ASC, p.id ASC`
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      products: result.rows,
    });
  } catch (error) {
    console.error("Unable to fetch products awaiting review.");
    return res.status(500).json({
      success: false,
      message: "Unable to fetch products awaiting review.",
    });
  }
});

// GET /api/reviewer/products/:id
// Return details only while the product is still waiting for review.
router.get("/products/:id", requireAuth, requireRole("reviewer"), async (req, res) => {
  const productIdText = req.params.id;
  const productId = Number(productIdText);

  if (
    !/^[1-9]\d*$/.test(productIdText) ||
    !Number.isSafeInteger(productId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.name,
         p.description,
         p.category,
         p.gender,
         p.size,
         p.brand,
         p.condition,
         p.price,
         p.status,
         p.review_status,
         p.created_at,
         COALESCE(
           (
             SELECT array_agg(pi.image_url ORDER BY pi.id)
             FROM product_images pi
             WHERE pi.product_id = p.id
           ),
           array_remove(ARRAY[p.image_url], NULL)
         ) AS images,
         json_build_object(
           'id', seller.id,
           'full_name', seller.full_name
         ) AS seller
       FROM products p
       JOIN users seller ON seller.id = p.seller_id
       WHERE p.id = $1
         AND p.status = 'pending_review'
         AND p.review_status = 'pending'`,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or no longer awaiting review.",
      });
    }

    return res.status(200).json({
      success: true,
      product: result.rows[0],
    });
  } catch (error) {
    console.error("Unable to fetch product review details.");
    return res.status(500).json({
      success: false,
      message: "Unable to fetch product details right now.",
    });
  }
});

// POST /api/reviewer/products/:id/approve
// Approve a pending product and record the decision in one transaction.
router.post("/products/:id/approve", requireAuth, requireRole("reviewer"), async (req, res) => {
  const productIdText = req.params.id;
  const productId = Number(productIdText);

  if (!/^[1-9]\d*$/.test(productIdText) || !Number.isSafeInteger(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID.",
    });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Approval details must be sent as a JSON object.",
    });
  }

  const unsupportedField = Object.keys(body).find(
    (field) => !allowedApprovalFields.has(field)
  );
  if (unsupportedField) {
    return res.status(400).json({
      success: false,
      message: `The field '${unsupportedField}' cannot be submitted.`,
    });
  }

  if (!isValidApprovedPrice(body.minPrice) || !isValidApprovedPrice(body.maxPrice)) {
    return res.status(400).json({
      success: false,
      message: "Minimum and maximum prices must be positive numbers with at most two decimal places.",
    });
  }

  if (body.minPrice > body.maxPrice) {
    return res.status(400).json({
      success: false,
      message: "Minimum price cannot be greater than maximum price.",
    });
  }

  if (
    body.reviewerNotes !== undefined &&
    body.reviewerNotes !== null &&
    typeof body.reviewerNotes !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Reviewer notes must be text.",
    });
  }

  const reviewerNotes =
    typeof body.reviewerNotes === "string" ? body.reviewerNotes.trim() || null : null;
  const reviewerId = req.session.user.id;
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // Lock the row so two reviewers cannot approve a stale pending state at once.
    const pendingProduct = await client.query(
      `SELECT id, seller_id, condition
       FROM products
       WHERE id = $1
         AND status = 'pending_review'
         AND review_status = 'pending'
       FOR UPDATE`,
      [productId]
    );

    if (pendingProduct.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: "Product not found or no longer awaiting review.",
      });
    }

    const product = pendingProduct.rows[0];
    if (Number(product.seller_id) === Number(reviewerId)) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(403).json({
        success: false,
        message: "You cannot approve your own product.",
      });
    }

    const updatedProduct = await client.query(
      `UPDATE products
       SET approved_min_price = $1,
           approved_max_price = $2,
           status = 'active',
           review_status = 'approved'
       WHERE id = $3
       RETURNING id, name, price, approved_min_price, approved_max_price,
                 status, review_status`,
      [body.minPrice, body.maxPrice, productId]
    );

    await client.query(
      `INSERT INTO product_reviews (
         product_id, reviewer_id, condition_grade, min_price, max_price,
         decision, reviewer_notes
       )
       VALUES ($1, $2, $3, $4, $5, 'approved', $6)`,
      [
        productId,
        reviewerId,
        product.condition,
        body.minPrice,
        body.maxPrice,
        reviewerNotes,
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Product approved successfully.",
      product: updatedProduct.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Keep database details out of the API response.
      }
    }

    console.error("Unable to approve product.");
    return res.status(500).json({
      success: false,
      message: "Unable to approve product right now.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// POST /api/reviewer/products/:id/reject
// Reject a pending product and record the reason in the same transaction.
router.post("/products/:id/reject", requireAuth, requireRole("reviewer"), async (req, res) => {
  const productIdText = req.params.id;
  const productId = Number(productIdText);

  if (!/^[1-9]\d*$/.test(productIdText) || !Number.isSafeInteger(productId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID.",
    });
  }

  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Rejection details must be sent as a JSON object.",
    });
  }

  const unsupportedField = Object.keys(body).find(
    (field) => !allowedRejectionFields.has(field)
  );
  if (unsupportedField) {
    return res.status(400).json({
      success: false,
      message: `The field '${unsupportedField}' cannot be submitted.`,
    });
  }

  if (typeof body.reviewerNotes !== "string") {
    return res.status(400).json({
      success: false,
      message: "A rejection reason is required.",
    });
  }

  const reviewerNotes = body.reviewerNotes.trim();
  if (!reviewerNotes || reviewerNotes.length > maximumReviewerNotesLength) {
    return res.status(400).json({
      success: false,
      message: `The rejection reason must be between 1 and ${maximumReviewerNotesLength} characters.`,
    });
  }

  const reviewerId = req.session.user.id;
  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    // Lock and recheck the product so a stale decision cannot overwrite another one.
    const pendingProduct = await client.query(
      `SELECT id, seller_id, condition
       FROM products
       WHERE id = $1
         AND status = 'pending_review'
         AND review_status = 'pending'
       FOR UPDATE`,
      [productId]
    );

    if (pendingProduct.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(404).json({
        success: false,
        message: "Product not found or no longer awaiting review.",
      });
    }

    const product = pendingProduct.rows[0];
    if (Number(product.seller_id) === Number(reviewerId)) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return res.status(403).json({
        success: false,
        message: "You cannot reject your own product.",
      });
    }

    const updatedProduct = await client.query(
      `UPDATE products
       SET status = 'rejected',
           review_status = 'rejected'
       WHERE id = $1
       RETURNING id, name, price, status, review_status`,
      [productId]
    );

    await client.query(
      `INSERT INTO product_reviews (
         product_id, reviewer_id, condition_grade, min_price, max_price,
         decision, reviewer_notes
       )
       VALUES ($1, $2, $3, NULL, NULL, 'rejected', $4)`,
      [productId, reviewerId, product.condition, reviewerNotes]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Product rejected successfully.",
      product: updatedProduct.rows[0],
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Keep database details out of the API response.
      }
    }

    console.error("Unable to reject product.");
    return res.status(500).json({
      success: false,
      message: "Unable to reject product right now.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

module.exports = router;
