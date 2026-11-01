
import { useState } from "react";
import "./App.css";

const products = [
  {
    id: 1,
    name: "Classic Denim Jacket",
    category: "Jackets",
    price: 499,
    condition: "Like New",
    brand: "Denim Co.",
    image:
      "https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 2,
    name: "Everyday White Shirt",
    category: "Shirts",
    price: 249,
    condition: "Very Good",
    brand: "Unbranded",
    image:
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 3,
    name: "Relaxed Fit T-Shirt",
    category: "T-Shirts",
    price: 129,
    condition: "Good",
    brand: "Unbranded",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 4,
    name: "Everyday Blue Jeans",
    category: "Jeans",
    price: 399,
    condition: "Very Good",
    brand: "Urban Wear",
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 5,
    name: "Soft Cotton Shirt",
    category: "Shirts",
    price: 179,
    condition: "Good",
    brand: "Unbranded",
    image:
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: 6,
    name: "Casual Denim Jacket",
    category: "Jackets",
    price: 699,
    condition: "Like New",
    brand: "Urban Wear",
    image:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=700&q=80",
  },
];

const categories = ["All", "Shirts", "T-Shirts", "Jeans", "Jackets"];

function App() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#" onClick={() => setSelectedProduct(null)}>
          thrift<span>+</span>
        </a>

        <nav className="nav-links">
          <a href="#discover">Discover</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <a className="sell-link" href="#how-it-works">
          Sell your clothes <span>↗</span>
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">GOOD FINDS. BETTER CHOICES.</p>
            <h1>
              A second life
              <br />
              for great <span>clothes.</span>
            </h1>
            <p className="hero-description">
              Discover affordable styles, give pre-loved clothing another
              chance, and make more thoughtful choices.
            </p>
            <a className="primary-button" href="#discover">
              Explore the collection <span>→</span>
            </a>
            <div className="hero-note">
              <span className="status-dot" />
              Thoughtful finds. Transparent pricing.
            </div>
          </div>

          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1100&q=85"
              alt="Friends browsing a clothing collection"
            />
            <div className="floating-note">
              <span className="note-icon">↻</span>
              <div>
                <strong>Wear it again.</strong>
                <p>Good clothes deserve another story.</p>
              </div>
            </div>
            <span className="hero-stamp">STYLE, REWORN.</span>
          </div>
        </section>

        <section className="trust-strip" id="how-it-works">
          <div>
            <span className="trust-number">01</span>
            <div>
              <strong>Discover your style</strong>
              <p>Find pieces that fit your everyday.</p>
            </div>
          </div>
          <div>
            <span className="trust-number">02</span>
            <div>
              <strong>Know what you buy</strong>
              <p>Clear condition and pricing information.</p>
            </div>
          </div>
          <div>
            <span className="trust-number">03</span>
            <div>
              <strong>Give clothes another life</strong>
              <p>Make more use of what already exists.</p>
            </div>
          </div>
        </section>

        <section className="collection" id="discover">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE THRIFT+ EDIT</p>
              <h2>Good things, found.</h2>
              <p className="section-description">
                Explore our sample collection of everyday favourites.
              </p>
            </div>
            <span className="product-count">
              {filteredProducts.length} pieces
            </span>
          </div>

          <div className="catalog-controls">
            <div className="category-list">
              {categories.map((category) => (
                <button
                  key={category}
                  className={
                    activeCategory === category
                      ? "category-button active"
                      : "category-button"
                  }
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <label className="search-box">
              <span>⌕</span>
              <input
                type="search"
                placeholder="Search pieces..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search clothing"
              />
            </label>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product) => (
                <button
                  className="product-card"
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  aria-label={`View ${product.name}`}
                >
                  <div className="product-image-wrap">
                    <img src={product.image} alt={product.name} loading="lazy" />
                    <span className="condition-tag">{product.condition}</span>
                    <span className="view-tag">View piece ↗</span>
                  </div>
                  <div className="product-info">
                    <div>
                      <p className="product-category">{product.category}</p>
                      <h3>{product.name}</h3>
                      <p className="product-brand">{product.brand}</p>
                    </div>
                    <strong className="product-price">
                      ₹{product.price}
                    </strong>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No pieces found</h3>
              <p>Try another search or choose a different category.</p>
              <button
                className="primary-button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <footer className="footer">
          <a className="brand footer-brand" href="#">
            thrift<span>+</span>
          </a>
          <p>Good finds deserve another life.</p>
          <span>Thrift+ · Frontend prototype</span>
        </footer>
      </main>

      {selectedProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Close product details"
            >
              ×
            </button>
            <img src={selectedProduct.image} alt={selectedProduct.name} />
            <div className="modal-details">
              <p className="eyebrow">{selectedProduct.category}</p>
              <h2 id="modal-title">{selectedProduct.name}</h2>
              <p className="modal-brand">{selectedProduct.brand}</p>
              <strong className="modal-price">
                ₹{selectedProduct.price}
              </strong>
              <p>
                Condition: <strong>{selectedProduct.condition}</strong>
              </p>
              <p className="prototype-note">
                This is sample product data. Seller details, availability,
                verified reviews and checkout will be added in later milestones.
              </p>
              <button
                className="primary-button"
                onClick={() =>
                  window.alert("Checkout will be implemented in a later milestone.")
                }
              >
                Continue exploring
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
