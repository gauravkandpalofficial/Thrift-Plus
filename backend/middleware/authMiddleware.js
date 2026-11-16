// Require a logged-in user before a protected route can continue.
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  return next();
}

// Create middleware that allows only users with one of the listed session roles.
// Examples: requireRole("seller") or requireRole("reviewer", "admin").
function requireRole(...roles) {
  // Also accept an array, which can be convenient when roles are already grouped.
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    // A missing session or user is an authentication problem, not a role mismatch.
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    // Only trust the role saved in the authenticated session.
    const sessionRole = req.session.user.role;
    if (typeof sessionRole !== "string" || !allowedRoles.includes(sessionRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };
