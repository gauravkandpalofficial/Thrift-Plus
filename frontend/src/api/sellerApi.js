const API_BASE_URL = "http://localhost:5000";

// Convert an HTTP status into a helpful message, using the backend message when available.
function getErrorMessage(status, responseData) {
  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }

  switch (status) {
    case 400:
      return "Please check the product details and try again.";
    case 401:
      return "Please log in to access seller products.";
    case 403:
      return "Your account does not have permission to manage seller products.";
    case 500:
      return "The server could not complete this request. Please try again.";
    default:
      return `The request failed with status ${status}.`;
  }
}

// Make a protected request and safely read its JSON response.
async function requestSellerApi(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      // The browser needs this option to send the existing Express session cookie.
      credentials: "include",
    });
  } catch {
    throw new Error("Could not connect to Thrift+. Check that the backend is running.");
  }

  // A server may return an empty or non-JSON body, so do not let parsing hide the HTTP error.
  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(getErrorMessage(response.status, responseData));
    error.status = response.status;
    throw error;
  }

  return responseData;
}

// Get the current seller's listings. The backend scopes these to the session user.
export async function getSellerProducts() {
  const responseData = await requestSellerApi("/api/seller/products");

  if (!Array.isArray(responseData?.products)) {
    throw new Error("The server returned an unexpected seller products response.");
  }

  return responseData.products;
}

// Create a product using only fields sellers are allowed to provide.
export async function createSellerProduct(productData) {
  if (!productData || typeof productData !== "object" || Array.isArray(productData)) {
    throw new Error("Product details must be provided as an object.");
  }

  // Ownership and listing workflow values are set by the backend, not sent by the form.
  const productFields = {
    name: productData.name,
    description: productData.description,
    category: productData.category,
    gender: productData.gender,
    size: productData.size,
    condition: productData.condition,
    brand: productData.brand,
    images: productData.images,
    price: productData.price,
  };

  const responseData = await requestSellerApi("/api/seller/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(productFields),
  });

  if (!responseData?.product || typeof responseData.product !== "object") {
    throw new Error("The server returned an unexpected product response.");
  }

  return responseData.product;
}
