import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    // Check the same basic limits as the backend before sending the request.
    if (!cleanName || !cleanEmail || !password || !role) {
      setError("Please complete every field.");
      return;
    }

    if (cleanName.length > 100) {
      setError("Full name must be no more than 100 characters.");
      return;
    }

    if (cleanEmail.length > 150 || !emailPattern.test(cleanEmail)) {
      setError("Enter a valid email address of no more than 150 characters.");
      return;
    }

    const passwordBytes = new TextEncoder().encode(password).length;
    if (password.length < 8 || passwordBytes > 72) {
      setError("Password must be at least 8 characters and no more than 72 UTF-8 bytes.");
      return;
    }

    if (role !== "buyer" && role !== "seller") {
      setError("Choose either Buyer or Seller.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration could not be completed.");
        return;
      }

      // Pass a one-time message to the login page after successful registration.
      // Registration does not log the visitor in.
      setUser(null);
      navigate("/login", {
        state: { registrationMessage: "Your account is ready. Please log in." },
      });
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

      <section className="auth-card" aria-labelledby="register-title">
        <p className="eyebrow">JOIN THE THRIFT+ COMMUNITY</p>
        <h1 id="register-title">Create your account.</h1>
        <p className="auth-intro">
          Find thoughtful pieces or give your pre-loved clothes a new home.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="register-full-name">Full name</label>
          <input
            id="register-full-name"
            name="fullName"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your name"
            required
          />

          <label htmlFor="register-email">Email address</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={150}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
          />
          <small className="auth-hint">Use 8 or more characters. Maximum 72 UTF-8 bytes.</small>

          <label htmlFor="register-role">Account type</label>
          <select
            id="register-role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            required
          >
            <option value="buyer">Buyer — I want to shop</option>
            <option value="seller">Seller — I want to list clothes</option>
          </select>

          {error && <p className="auth-message auth-error" role="alert">{error}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
