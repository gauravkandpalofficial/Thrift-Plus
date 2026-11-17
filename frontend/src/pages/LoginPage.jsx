import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sellerPaths = new Set(["/seller/dashboard", "/seller/add-product"]);

function getSafeSellerRedirect(path) {
  if (typeof path !== "string") {
    return null;
  }

  try {
    // Only allow a same-origin URL for one of our known seller routes.
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin || !sellerPaths.has(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const registrationMessage = location.state?.registrationMessage;
  const returnTo = getSafeSellerRedirect(location.state?.from);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Enter your email address and password.");
      return;
    }

    if (cleanEmail.length > 150 || !emailPattern.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to log in. Check your details and try again.");
        return;
      }

      // Update shared app state as well as the browser-held session cookie.
      setUser(data.user);
      navigate(returnTo || "/", { replace: true });
    } catch {
      setError("Could not connect to Thrift+. Check that the backend is running and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="brand" to="/" aria-label="Thrift+ home">
          thrift<span>+</span>
        </Link>
        <Link className="auth-home-link" to="/">Back to the catalogue</Link>
      </header>

      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">WELCOME BACK</p>
        <h1 id="login-title">Login</h1>

        {registrationMessage && (
          <p className="auth-message auth-success" role="status">{registrationMessage}</p>
        )}

        {!registrationMessage && (
          <p className="auth-intro">Log in to continue to your Thrift+ account.</p>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={150}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="login-password">Password</label>
          <div className="auth-password-field">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              required
            />
            <button
              className="password-visibility-button"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-controls="login-password"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <p className="auth-message auth-error" role="alert">{error}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          New to Thrift+? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
