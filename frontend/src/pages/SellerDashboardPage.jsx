import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getSellerProducts } from "../api/sellerApi.js";
import { useAuth } from "../context/useAuth.js";

const statusLabels = {
  active: { label: "Active", className: "active" },
  pending_review: { label: "Under Review", className: "pending" },
  rejected: { label: "Rejected", className: "rejected" },
  draft: { label: "Draft", className: "draft" },
  sold: { label: "Sold", className: "sold" },
  archived: { label: "Archived", className: "archived" },
};

const reviewStatusLabels = {
  not_required: "Not required",
  pending: "Pending",
  needs_info: "Needs information",
  approved: "Approved",
  rejected: "Rejected",
};

function formatPrice(value) {
  const numericPrice = Number(value);
  if (!Number.isFinite(numericPrice)) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numericPrice);
}

function ProductImage({ imageUrl, name }) {
  const [hasLoadError, setHasLoadError] = useState(false);

  if (!imageUrl || hasLoadError) {
    return (
      <div className="seller-product-image-fallback" role="img" aria-label={`${name} image unavailable`}>
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      className="seller-product-image"
      src={imageUrl}
      alt={name}
      loading="lazy"
      onError={() => setHasLoadError(true)}
    />
  );
}

function SellerDashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const inFlightRequest = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadProducts() {
      setIsLoading(true);
      setError("");

      // Reuse an in-flight request if React Strict Mode re-runs this effect in development.
      let request = inFlightRequest.current;
      if (!request) {
        request = getSellerProducts();
        inFlightRequest.current = request;
      }

      try {
        const sellerProducts = await request;
        if (isCurrent) {
          setProducts(sellerProducts);
        }
      } catch (requestError) {
        if (isCurrent) {
          setError(requestError.message || "Unable to load your products.");
        }
      } finally {
        if (inFlightRequest.current === request) {
          inFlightRequest.current = null;
        }
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isCurrent = false;
    };
  }, [retryCount]);

  const totalListings = products.length;
  const activeProducts = products.filter((product) => product.status === "active").length;
  const underReviewProducts = products.filter((product) => product.status === "pending_review").length;
  const rejectedProducts = products.filter(
    (product) => product.status === "rejected" || product.review_status === "rejected"
  ).length;

  const summaryCards = [
    { label: "Total Listings", value: totalListings, className: "total" },
    { label: "Active Products", value: activeProducts, className: "active" },
    { label: "Under Review", value: underReviewProducts, className: "pending" },
    { label: "Rejected Products", value: rejectedProducts, className: "rejected" },
  ];

  return (
    <main className="seller-dashboard-page">
      <header className="seller-dashboard-header">
        <Link className="brand" to="/" aria-label="Thrift+ home">
          thrift<span>+</span>
        </Link>
        <Link className="seller-catalogue-link" to="/">Back to the catalogue</Link>
      </header>

      <div className="seller-dashboard-content">
        <section className="seller-dashboard-heading">
          <div>
            <p className="eyebrow">SELLER SPACE</p>
            <h1>Your listings{user?.full_name ? `, ${user.full_name}` : ""}</h1>
            <p className="seller-dashboard-intro">
              Keep track of your clothing listings and their review status.
            </p>
          </div>
          <div className="seller-add-action">
            <Link className="primary-button seller-add-button" to="/seller/add-product">
              Add New Product <span>＋</span>
            </Link>
          </div>
        </section>

        {isLoading ? (
          <section className="seller-dashboard-state" role="status" aria-live="polite" aria-busy="true">
            <span className="seller-loading-mark" aria-hidden="true">↻</span>
            <h2>Loading your listings…</h2>
            <p>Please wait while we fetch your seller products.</p>
          </section>
        ) : error ? (
          <section className="seller-dashboard-state seller-dashboard-error" role="alert">
            <h2>We couldn’t load your listings</h2>
            <p>{error}</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </button>
          </section>
        ) : (
          <>
            <section className="seller-summary-grid" aria-label="Listing summary">
              {summaryCards.map((card) => (
                <article className={`seller-summary-card seller-summary-card--${card.className}`} key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </section>

            <section className="seller-listings-section" aria-labelledby="seller-listings-title">
              <div className="seller-listings-heading">
                <div>
                  <p className="eyebrow">YOUR COLLECTION</p>
                  <h2 id="seller-listings-title">Product listings</h2>
                </div>
                <span className="seller-listing-count">{totalListings} {totalListings === 1 ? "listing" : "listings"}</span>
              </div>

              {products.length === 0 ? (
                <div className="seller-empty-state">
                  <span className="seller-empty-icon" aria-hidden="true">↗</span>
                  <h3>Your seller space is ready</h3>
                  <p>You don’t have any product listings yet. Your first listing can start here.</p>
                  <Link className="primary-button seller-add-button" to="/seller/add-product">
                    Add New Product <span>＋</span>
                  </Link>
                </div>
              ) : (
                <div className="seller-product-list">
                  {products.map((product) => {
                    const status = statusLabels[product.status] || {
                      label: product.status || "Unknown",
                      className: "unknown",
                    };
                    const reviewStatus = reviewStatusLabels[product.review_status] || product.review_status || "Unknown";
                    const imageUrl = product.image || product.images?.[0] || "";
                    const hasApprovedRange =
                      product.approved_min_price !== null && product.approved_min_price !== undefined &&
                      product.approved_max_price !== null && product.approved_max_price !== undefined;

                    return (
                      <article className="seller-product-card" key={product.id}>
                        <ProductImage imageUrl={imageUrl} name={product.name || "Product"} />
                        <div className="seller-product-details">
                          <div className="seller-product-title-row">
                            <div>
                              <p className="seller-product-category">{product.category || "Category unavailable"}</p>
                              <h3>{product.name || "Untitled product"}</h3>
                            </div>
                            <strong className="seller-product-price">{formatPrice(product.price)}</strong>
                          </div>

                          <dl className="seller-product-facts">
                            <div><dt>Size</dt><dd>{product.size || "—"}</dd></div>
                            <div><dt>Condition</dt><dd>{product.condition || "—"}</dd></div>
                            <div><dt>Brand</dt><dd>{product.brand || "Unbranded"}</dd></div>
                          </dl>

                          <div className="seller-product-status-row">
                            <span className={`seller-status-badge seller-status-badge--${status.className}`}>
                              {status.label}
                            </span>
                            <span className="seller-review-status">Review: {reviewStatus}</span>
                          </div>

                          {hasApprovedRange && (
                            <p className="seller-approved-range">
                              Approved price range: {formatPrice(product.approved_min_price)} – {formatPrice(product.approved_max_price)}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default SellerDashboardPage;
