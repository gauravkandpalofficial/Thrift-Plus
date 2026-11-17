import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

function RequireSeller() {
  const { user, isCheckingSession } = useAuth();
  const location = useLocation();

  // Keep protected content hidden until the saved session has been checked.
  if (isCheckingSession) {
    return (
      <main className="auth-page" aria-busy="true">
        <section className="auth-card" role="status" aria-live="polite">
          <p className="eyebrow">THRIFT+ ACCOUNT</p>
          <h1>Checking your account…</h1>
          <p className="auth-intro">Please wait while we restore your session.</p>
        </section>
      </main>
    );
  }

  // Save the requested in-app URL so a later login flow can return the visitor there.
  if (!user) {
    const requestedUrl = `${location.pathname}${location.search}${location.hash}`;

    return (
      <Navigate
        to="/login"
        state={{ from: requestedUrl }}
        replace
      />
    );
  }

  // Only sellers may open seller pages. This also denies any unexpected role safely.
  if (user.role !== "seller") {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="seller-access-title">
          <p className="eyebrow">SELLER AREA</p>
          <h1 id="seller-access-title">Seller access required</h1>
          <p className="auth-intro">
            This page is available to seller accounts. Your account does not have seller access.
          </p>
          <Link className="primary-button" to="/">Return to the catalogue</Link>
        </section>
      </main>
    );
  }

  return <Outlet />;
}

export default RequireSeller;
