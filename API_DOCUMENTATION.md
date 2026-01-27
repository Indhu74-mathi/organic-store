# API Documentation - Organic Store

This document lists all the APIs used in the organic store application, organized by functionality.

## 📦 Product APIs

### 1. Fetch All Products
**Endpoint:** `GET /api/products`

**Description:** List all active products with unique product_id for catalog display

**Query Parameters:**
- `excludeOutOfStock` (boolean): Filter out products with no stock
- `includeOutOfStock` (boolean): Include out-of-stock products
- `category` (string): Filter by category name (case-insensitive, exact match)
- `q` or `search` (string): Search products by name (case-insensitive, partial match)

**Response:**
```json
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "slug": "string",
      "description": "string",
      "price": "number (in rupees)",
      "discountPercent": "number",
      "imageUrl": "string",
      "category": "string",
      "stock": "number",
      "inStock": "boolean",
      "isActive": "boolean",
      "image": "string",
      "images": ["string"],
      "variants": [  // Only for Malt and Saadha Podi categories
        {
          "id": "string",
          "sizeGrams": "number",
          "price": "number",
          "stock": "number",
          "inStock": "boolean"
        }
      ]
    }
  ]
}
```

**Authentication:** Public (no auth required)

**Examples:**
- Get all products: `/api/products`
- Get products in category: `/api/products?category=Malt`
- Search products: `/api/products?q=almond`
- Filter category + search: `/api/products?category=Nuts&q=cashew`

---

### 2. Fetch All Categories
**Endpoint:** `GET /api/categories`

**Description:** List all unique categories with product counts

**Response:**
```json
{
  "categories": [
    {
      "id": "string (slug-like ID)",
      "name": "string",
      "productCount": "number"
    }
  ]
}
```

**Authentication:** Public (no auth required)

---

### 3. Search Products
**Endpoint:** `GET /api/products/search`

**Description:** Search products by name with optional category filtering

**Query Parameters:**
- `q` or `search` (string, required): Search query for product name
- `category` (string, optional): Filter by category
- `excludeOutOfStock` (boolean): Filter out products with no stock

**Response:**
```json
{
  "products": [...],  // Same format as GET /api/products
  "query": "string (search term used)",
  "count": "number (result count)"
}
```

**Authentication:** Public (no auth required)

**Examples:**
- Search by name: `/api/products/search?q=almond`
- Search in category: `/api/products/search?q=powder&category=Malt`

---

### 4. Fetch Product by Slug
**Endpoint:** `GET /api/products/[slug]`

**Description:** Fetch a single product using its slug for product detail pages

**Response:**
```json
{
  "product": {
    "id": "string",
    "name": "string",
    "slug": "string",
    "description": "string",
    "price": "number",
    "discountPercent": "number",
    "imageUrl": "string",
    "category": "string",
    "stock": "number",
    "inStock": "boolean",
    "image": "string",
    "variants": [...]  // Same as above
  }
}
```

**Authentication:** Public (no auth required)

---

## 🛒 Cart APIs

### 3. Get Cart
**Endpoint:** `GET /api/cart`

**Description:** Fetch the authenticated user's cart with all items

**Response:**
```json
{
  "cartId": "string",
  "items": [
    {
      "cartItemId": "string",
      "product": {
        "id": "string",
        "slug": "string",
        "name": "string",
        "description": "string",
        "price": "number",
        "discountPercent": "number",
        "category": "string",
        "image": "string",
        "inStock": "boolean",
        "stock": "number",
        "sizeGrams": "number"  // Only for variant products
      },
      "quantity": "number"
    }
  ]
}
```

**Authentication:** Required (JWT token)

---

### 4. Add Item to Cart
**Endpoint:** `POST /api/cart/items`

**Description:** Add a product to cart or update quantity if already exists

**Request Body:**
```json
{
  "productId": "string (required)",
  "quantity": "number (default: 1, max: 99)",
  "variantId": "string (required for Malt/Saadha Podi products)"
}
```

**Response:**
```json
{
  "success": true,
  "cartItemId": "string",
  "product": {...},
  "quantity": "number"
}
```

**Authentication:** Required (JWT token)

---

### 5. Update Cart Item Quantity
**Endpoint:** `PATCH /api/cart/items/[cartItemId]`

**Description:** Update the quantity of a specific cart item

**Request Body:**
```json
{
  "quantity": "number (1-99)"
}
```

**Authentication:** Required (JWT token)

---

### 6. Remove Cart Item
**Endpoint:** `DELETE /api/cart/items/[cartItemId]`

**Description:** Remove a specific item from the cart

**Authentication:** Required (JWT token)

---

### 7. Merge Guest Cart
**Endpoint:** `POST /api/cart/merge`

**Description:** Merge guest cart items into authenticated user's cart

**Request Body:**
```json
{
  "guestCartItems": [
    {
      "productId": "string",
      "quantity": "number",
      "variantId": "string"  // Optional
    }
  ]
}
```

**Authentication:** Required (JWT token)

---

## 📋 Order APIs

### 8. Get All Orders
**Endpoint:** `GET /api/orders`

**Description:** Fetch all orders for the authenticated user

**Response:**
```json
{
  "orders": [
    {
      "id": "string",
      "status": "string",
      "totalAmount": "number (in rupees)",
      "currency": "string",
      "createdAt": "timestamp",
      "paidAt": "timestamp",
      "paymentStatus": "paid|pending|failed|cancelled|refunded",
      "itemCount": "number",
      "items": []
    }
  ]
}
```

**Authentication:** Required (JWT token)

---

### 9. Get Order Details
**Endpoint:** `GET /api/orders/[orderId]`

**Description:** Fetch detailed information about a specific order

**Authentication:** Required (JWT token)

---

### 10. Create Order
**Endpoint:** `POST /api/orders/create`

**Description:** Create a new order from cart items

**Request Body:**
```json
{
  "shippingAddress": {
    "fullName": "string",
    "phone": "string",
    "addressLine1": "string",
    "addressLine2": "string",
    "city": "string",
    "state": "string",
    "pincode": "string"
  }
}
```

**Authentication:** Required (JWT token)

---

### 11. Cancel Order
**Endpoint:** `POST /api/orders/[orderId]/cancel`

**Description:** Cancel a pending order

**Authentication:** Required (JWT token)

---

### 12. Mark Order as Failed
**Endpoint:** `POST /api/orders/[orderId]/mark-failed`

**Description:** Mark an order as failed (internal use)

**Authentication:** Required (JWT token)

---

## 💳 Payment APIs

### 13. Create Payment Order
**Endpoint:** `POST /api/payments/create-order`

**Description:** Create a Razorpay payment order for online payment

**Request Body:**
```json
{
  "orderId": "string",
  "amount": "number (in paise)",
  "currency": "INR"
}
```

**Response:**
```json
{
  "razorpayOrderId": "string",
  "amount": "number",
  "currency": "string",
  "key": "string (Razorpay key)"
}
```

**Authentication:** Required (JWT token)

---

### 14. Verify Payment
**Endpoint:** `POST /api/payments/verify`

**Description:** Verify Razorpay payment signature and update order status

**Request Body:**
```json
{
  "razorpay_order_id": "string",
  "razorpay_payment_id": "string",
  "razorpay_signature": "string",
  "orderId": "string"
}
```

**Authentication:** Required (JWT token)

---

### 15. Create COD Order
**Endpoint:** `POST /api/payments/create`

**Description:** Create a Cash on Delivery order

**Request Body:**
```json
{
  "orderId": "string"
}
```

**Authentication:** Required (JWT token)

---

## 🔐 Authentication APIs

### 16. Verify OTP
**Endpoint:** `POST /api/auth/verify-otp`

**Description:** Verify OTP for phone authentication

**Request Body:**
```json
{
  "phone": "string",
  "otp": "string"
}
```

**Authentication:** Public

---

### 17. Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request password reset link

**Request Body:**
```json
{
  "email": "string"
}
```

**Authentication:** Public

---

### 18. Reset Password
**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using token

**Request Body:**
```json
{
  "token": "string",
  "password": "string"
}
```

**Authentication:** Public

---

## 🔧 Admin APIs

### 19. Get All Products (Admin)
**Endpoint:** `GET /api/admin/products`

**Description:** Fetch all products including inactive ones (admin only)

**Authentication:** Required (Admin role)

---

### 20. Create Product (Admin)
**Endpoint:** `POST /api/admin/products`

**Description:** Create a new product

**Authentication:** Required (Admin role)

---

### 21. Update Product (Admin)
**Endpoint:** `PATCH /api/admin/products/[id]`

**Description:** Update product details

**Authentication:** Required (Admin role)

---

### 22. Delete Product (Admin)
**Endpoint:** `DELETE /api/admin/products/[id]`

**Description:** Delete a product

**Authentication:** Required (Admin role)

---

### 23. Upload Product Image (Admin)
**Endpoint:** `POST /api/admin/products/upload-image`

**Description:** Upload product image to storage

**Authentication:** Required (Admin role)

---

### 24. Import Static Products (Admin)
**Endpoint:** `POST /api/admin/products/import-static`

**Description:** Bulk import products from static data

**Authentication:** Required (Admin role)

---

### 25. Bulk Activate Products (Admin)
**Endpoint:** `POST /api/admin/products/bulk-activate`

**Description:** Activate multiple products at once

**Authentication:** Required (Admin role)

---

### 26. Create Product Variant (Admin)
**Endpoint:** `POST /api/admin/products/[id]/variants`

**Description:** Add a new variant to a product

**Authentication:** Required (Admin role)

---

### 27. Update Product Variant (Admin)
**Endpoint:** `PATCH /api/admin/products/[id]/variants/[variantId]`

**Description:** Update variant details

**Authentication:** Required (Admin role)

---

### 28. Delete Product Variant (Admin)
**Endpoint:** `DELETE /api/admin/products/[id]/variants/[variantId]`

**Description:** Delete a product variant

**Authentication:** Required (Admin role)

---

### 29. Get All Orders (Admin)
**Endpoint:** `GET /api/admin/orders`

**Description:** Fetch all orders across all users

**Authentication:** Required (Admin role)

---

### 30. Update Order Status (Admin)
**Endpoint:** `PATCH /api/admin/orders/[orderId]`

**Description:** Update order status

**Authentication:** Required (Admin role)

---

### 31. Refund Order (Admin)
**Endpoint:** `POST /api/admin/orders/[orderId]/refund`

**Description:** Process order refund

**Authentication:** Required (Admin role)

---

## 📊 Summary

| Category | Count | Authentication |
|----------|-------|----------------|
| Product APIs | 4 | Public |
| Cart APIs | 5 | Required |
| Order APIs | 5 | Required |
| Payment APIs | 3 | Required |
| Auth APIs | 3 | Public |
| Admin APIs | 13 | Admin Required |
| **Total** | **33** | - |

## 🔑 Authentication Methods

- **Public APIs**: No authentication required
- **User APIs**: JWT token via Supabase Auth (cookies)
- **Admin APIs**: JWT token + Admin role verification

## 💰 Currency Format

- All prices are stored in **paise** (1 rupee = 100 paise) in the database
- API responses convert to **rupees** for frontend display
- Payment amounts use **paise** for Razorpay integration
