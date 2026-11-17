const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();
const pool = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const allowedFields = new Set(["fullName", "email", "password"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/admin/reviewers
// Only an authenticated Admin can provision a Reviewer account.
router.post("/reviewers", requireAuth, requireRole("admin"), async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({
      success: false,
      message: "Reviewer details must be sent as a JSON object.",
    });
  }

  const unsupportedField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unsupportedField) {
    return res.status(400).json({
      success: false,
      message: `The field '${unsupportedField}' cannot be submitted.`,
    });
  }

  if (
    typeof body.fullName !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Full name, email, and password are required.",
    });
  }

  const fullName = body.fullName.trim();
  const email = body.email.trim().toLowerCase();
  const password = body.password;

  if (fullName.length < 1 || fullName.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Full name must be between 1 and 100 characters.",
    });
  }

  if (email.length > 150 || !emailPattern.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address of at most 150 characters.",
    });
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
    });
  }

  try {
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const creatorId = req.session.user.id;

    // The role is fixed by the API, never supplied by the Admin's request.
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, 'reviewer')
       RETURNING id, full_name, email, role`,
      [fullName, email, passwordHash]
    );

    const reviewer = result.rows[0];
    // Record which authenticated Admin performed the provisioning in server logs.
    console.info("Reviewer account created by Admin", {
      adminId: creatorId,
      reviewerId: reviewer.id,
    });

    return res.status(201).json({
      success: true,
      user: reviewer,
    });
  } catch (error) {
    // The unique constraint also handles requests that race after the email check.
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Reviewer account creation failed.");
    return res.status(500).json({
      success: false,
      message: "Unable to create Reviewer account right now.",
    });
  }
});

module.exports = router;
