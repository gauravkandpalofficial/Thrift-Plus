const express = require("express");
const bcrypt = require("bcrypt");

const router = express.Router();
const pool = require("../config/db");

const allowedRoles = new Set(["buyer", "seller"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { fullName, email, password, role } = req.body || {};

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof role !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Full name, email, password, and role are required.",
    });
  }

  const normalizedFullName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedFullName.length < 1 || normalizedFullName.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Full name must be between 1 and 100 characters.",
    });
  }

  if (
    normalizedEmail.length > 150 ||
    !emailPattern.test(normalizedEmail)
  ) {
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

  if (!allowedRoles.has(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be either buyer or seller.",
    });
  }

  try {
    // Check case-insensitively in case older rows contain mixed-case emails.
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role, created_at`,
      [normalizedFullName, normalizedEmail, passwordHash, role]
    );

    return res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    // The unique constraint also protects against two requests racing each other.
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to register account right now.",
    });
  }
});

module.exports = router;
