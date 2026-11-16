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

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  // Login needs both fields. Do not trim the password because spaces may be intentional.
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    email.trim().length === 0 ||
    password.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length > 150 || !emailPattern.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address.",
    });
  }

  try {
    // Parameterized SQL safely looks up the account by its normalized email.
    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, role
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    // Use the same response for an unknown email and a wrong password.
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Replace the existing session ID to prevent session fixation.
    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        console.error("Unable to regenerate login session:", regenerateError.message);
        return res.status(500).json({
          success: false,
          message: "Unable to log in right now.",
        });
      }

      // Store only the safe account details needed by later protected routes.
      req.session.user = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      };

      // Wait for PostgreSQL to save the session before confirming login.
      req.session.save((saveError) => {
        if (saveError) {
          console.error("Unable to save login session:", saveError.message);
          return res.status(500).json({
            success: false,
            message: "Unable to log in right now.",
          });
        }

        return res.status(200).json({
          success: true,
          user: req.session.user,
        });
      });
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to log in right now.",
    });
  }
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  // A session can exist without a logged-in user, so check the user data itself.
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "You are not logged in.",
    });
  }

  // Return only the safe fields that login stored in the session.
  const { id, full_name, email, role } = req.session.user;

  return res.status(200).json({
    success: true,
    user: { id, full_name, email, role },
  });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  // Match these options to the cookie configured in server.js so the browser
  // clears the same cookie (including its path) that login created.
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  };

  const clearSessionCookie = () => {
    res.clearCookie("connect.sid", cookieOptions);
  };

  // Be tolerant if the request has no Express session at all.
  if (!req.session) {
    clearSessionCookie();
    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }

  // Destroy removes this session from PostgreSQL, so its old cookie cannot log in again.
  req.session.destroy((error) => {
    clearSessionCookie();

    if (error) {
      console.error("Unable to destroy logout session:", error.message);
      return res.status(500).json({
        success: false,
        message: "Unable to log out right now.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  });
});

module.exports = router;
