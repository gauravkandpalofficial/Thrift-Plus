import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createSellerProduct } from "../api/sellerApi.js";

const categories = ["Shirts", "T-Shirts", "Jeans", "Shorts", "Jackets"];
const genders = ["Men", "Women", "Unisex"];
const conditions = ["Like New", "Very Good", "Good", "Fair"];
const maximumImages = 5;
const maximumPrice = 99999999.99;

function isValidImageUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password;
  } catch {
    return false;
  }
}

function AddProductPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("Unisex");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState("");
  const [brand, setBrand] = useState("Unbranded");
  const [images, setImages] = useState([""]);
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  const submissionLock = useRef(false);

  function updateImage(index, value) {
    setImages((currentImages) =>
      currentImages.map((image, imageIndex) => imageIndex === index ? value : image)
    );
  }

  function addImageField() {
    setImages((currentImages) => {
      if (currentImages.length >= maximumImages) {
        return currentImages;
      }
      return [...currentImages, ""];
    });
  }

  function removeImageField(indexToRemove) {
    setImages((currentImages) =>
      currentImages.length > 1
        ? currentImages.filter((_, index) => index !== indexToRemove)
        : currentImages
    );
  }

  function validateForm() {
    const cleanName = name.trim();
    const cleanSize = size.trim();
    const cleanBrand = brand.trim() || "Unbranded";
    const imageUrls = images.map((image) => image.trim());
    const numericPrice = Number(price);

    if (!cleanName) {
      return { message: "Enter a product name.", valid: false };
    }
    if (cleanName.length > 150) {
      return { message: "Product name must be no more than 150 characters.", valid: false };
    }
    if (!categories.includes(category)) {
      return { message: "Choose a product category.", valid: false };
    }
    if (!genders.includes(gender)) {
      return { message: "Choose Men, Women, or Unisex for gender.", valid: false };
    }
    if (!cleanSize) {
      return { message: "Enter a product size.", valid: false };
    }
    if (cleanSize.length > 30) {
      return { message: "Size must be no more than 30 characters.", valid: false };
    }
    if (!conditions.includes(condition)) {
      return { message: "Choose the product condition.", valid: false };
    }
    if (cleanBrand.length > 100) {
      return { message: "Brand must be no more than 100 characters.", valid: false };
    }
    if (images.length < 1 || images.length > maximumImages || imageUrls.some((image) => !image)) {
      return { message: `Provide between 1 and ${maximumImages} image URLs, and complete each URL field.`, valid: false };
    }
    if (imageUrls.some((image) => image.length > 2048 || !isValidImageUrl(image))) {
      return { message: "Each image must be a valid HTTP or HTTPS URL of at most 2048 characters.", valid: false };
    }
    if (
      price.trim() === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      numericPrice > maximumPrice ||
      Math.round(numericPrice * 100) / 100 !== numericPrice
    ) {
      return { message: "Enter a non-negative price with no more than two decimal places.", valid: false };
    }

    return {
      valid: true,
      productData: {
        name: cleanName,
        description: description.trim(),
        category,
        gender,
        size: cleanSize,
        condition,
        brand: cleanBrand,
        images: imageUrls,
        price: numericPrice,
      },
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (submissionLock.current) {
      return;
    }

    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);

    try {
      // The helper calls the API and resolves only when the backend accepts creation.
      const product = await createSellerProduct(validation.productData);
      setCreatedProduct(product);
    } catch (requestError) {
      setError(requestError.message || "Unable to create this product. Please try again.");
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }

  const returnedStatus = createdProduct?.status;
  const successMessage = returnedStatus === "pending_review"
    ? "Your product was submitted for human price review. It will stay hidden from the public catalogue until approval."
    : returnedStatus === "active"
      ? "Your product was created and is now active."
      : "Your product was created successfully.";

  return (
    <main className="seller-dashboard-page">
      <header className="seller-dashboard-header">
        <Link className="brand" to="/" aria-label="Thrift+ home">
          thrift<span>+</span>
        </Link>
        <Link className="seller-catalogue-link" to="/seller/dashboard">Back to seller dashboard</Link>
      </header>

      <div className="seller-dashboard-content seller-add-page-content">
        <section className="seller-dashboard-heading seller-add-page-heading">
          <div>
            <p className="eyebrow">SELLER SPACE</p>
            <h1>Add a product</h1>
            <p className="seller-dashboard-intro">
              Share the details clearly so shoppers know what makes your piece special.
            </p>
          </div>
        </section>

        {createdProduct ? (
          <section className="seller-add-success" role="status" aria-live="polite">
            <span className="seller-success-mark" aria-hidden="true">✓</span>
            <p className="eyebrow">LISTING SUBMITTED</p>
            <h2>{successMessage}</h2>
            <p>
              {createdProduct.name} — current status: {createdProduct.status || "created"}.
            </p>
            <Link className="primary-button" to="/seller/dashboard">Return to seller dashboard</Link>
          </section>
        ) : (
          <form className="seller-add-form" onSubmit={handleSubmit} noValidate>
            <div className="seller-form-grid">
              <div className="seller-form-field seller-form-field--wide">
                <label htmlFor="product-name">Product name <span aria-hidden="true">*</span></label>
                <input
                  id="product-name"
                  name="name"
                  type="text"
                  maxLength={150}
                  autoComplete="off"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Vintage Denim Jacket"
                  required
                />
              </div>

              <div className="seller-form-field seller-form-field--wide">
                <label htmlFor="product-description">Description <span className="seller-optional-label">Optional</span></label>
                <textarea
                  id="product-description"
                  name="description"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the fit, material, or other useful details."
                />
              </div>

              <div className="seller-form-field">
                <label htmlFor="product-category">Category <span aria-hidden="true">*</span></label>
                <select id="product-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} required>
                  <option value="">Choose a category</option>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="seller-form-field">
                <label htmlFor="product-gender">Gender</label>
                <select id="product-gender" name="gender" value={gender} onChange={(event) => setGender(event.target.value)}>
                  {genders.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="seller-form-field">
                <label htmlFor="product-size">Size <span aria-hidden="true">*</span></label>
                <input
                  id="product-size"
                  name="size"
                  type="text"
                  maxLength={30}
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  placeholder="e.g. M, 32, One size"
                  required
                />
              </div>

              <div className="seller-form-field">
                <label htmlFor="product-condition">Condition <span aria-hidden="true">*</span></label>
                <select id="product-condition" name="condition" value={condition} onChange={(event) => setCondition(event.target.value)} required>
                  <option value="">Choose a condition</option>
                  {conditions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div className="seller-form-field seller-form-field--wide">
                <label htmlFor="product-brand">Brand <span className="seller-optional-label">Optional</span></label>
                <input
                  id="product-brand"
                  name="brand"
                  type="text"
                  maxLength={100}
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="Unbranded"
                />
                <small>Leave blank to list as Unbranded.</small>
              </div>

              <fieldset className="seller-form-field seller-form-field--wide seller-image-fields">
                <legend>Product image URLs <span aria-hidden="true">*</span></legend>
                <p className="seller-field-help">Add between 1 and {maximumImages} public HTTP or HTTPS image links.</p>
                {images.map((image, index) => (
                  <div className="seller-image-url-row" key={index}>
                    <label className="seller-visually-hidden" htmlFor={`product-image-${index + 1}`}>
                      Product image URL {index + 1}
                    </label>
                    <input
                      id={`product-image-${index + 1}`}
                      name="images[]"
                      type="url"
                      maxLength={2048}
                      value={image}
                      onChange={(event) => updateImage(index, event.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      required
                    />
                    <button
                      className="seller-remove-image-button"
                      type="button"
                      onClick={() => removeImageField(index)}
                      disabled={images.length === 1}
                      aria-label={`Remove image URL ${index + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button className="seller-add-image-button" type="button" onClick={addImageField} disabled={images.length >= maximumImages}>
                  + Add another image
                </button>
              </fieldset>

              <div className="seller-form-field seller-form-field--wide">
                <label htmlFor="product-price">Expected selling price (₹) <span aria-hidden="true">*</span></label>
                <input
                  id="product-price"
                  name="price"
                  type="number"
                  min="0"
                  max={maximumPrice}
                  step="0.01"
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0.00"
                  required
                />
                <div className="seller-pricing-note">
                  <strong>Thrift+ pricing policy</strong>
                  <ul>
                    <li>Below ₹150: eligible for direct listing after validation.</li>
                    <li>₹150 or above: sent for human price review and kept hidden from the public catalogue until approval.</li>
                  </ul>
                  <p>The backend decides the listing and review status after you submit.</p>
                </div>
              </div>
            </div>

            {error && <p className="auth-message auth-error seller-form-error" role="alert">{error}</p>}

            <div className="seller-form-actions">
              <button className="primary-button seller-submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting product…" : "Submit product"}
              </button>
              <Link className="seller-cancel-link" to="/seller/dashboard">Cancel and return to dashboard</Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

export default AddProductPage;
