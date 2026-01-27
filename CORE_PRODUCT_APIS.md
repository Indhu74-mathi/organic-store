# Core Product APIs

This document covers the 5 essential product APIs for catalog and product discovery.

---

## 1. Fetch All Products

**Endpoint:** `GET /api/products`

**Description:** List each separate product with unique product_id. This list will be used for catalog.

**Query Parameters:**
- `excludeOutOfStock` (boolean, optional): Filter out products with no stock
- `includeOutOfStock` (boolean, optional): Include out-of-stock products
- `category` (string, optional): Filter by category name (case-insensitive)
- `q` or `search` (string, optional): Search products by name (partial match)

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
      "variants": [
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
```
GET /api/products
GET /api/products?excludeOutOfStock=true
GET /api/products?category=Malt
GET /api/products?q=almond
```

---

## 2. Fetch All Categories

**Endpoint:** `GET /api/categories`

**Description:** List of categories with category_id (if available).

**Response:**
```json
{
  "categories": [
    {
      "id": "malt",
      "name": "Malt",
      "productCount": 15
    },
    {
      "id": "nuts",
      "name": "Nuts",
      "productCount": 8
    }
  ]
}
```

**Authentication:** Public (no auth required)

**Notes:**
- Categories are sorted by product count (descending)
- The `id` field is auto-generated as a slug from the category name
- Only returns categories from active products

**Example:**
```
GET /api/categories
```

---

## 3. Fetch All Products in a Category

**Endpoint:** `GET /api/products?category={categoryName}`

**Description:** List of products within particular category.

**Query Parameters:**
- `category` (string, required): Category name (case-insensitive)
- `excludeOutOfStock` (boolean, optional): Filter out products with no stock

**Response:**
```json
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "category": "Malt",
      "price": "number",
      "stock": "number",
      "inStock": "boolean",
      ...
    }
  ]
}
```

**Authentication:** Public (no auth required)

**Examples:**
```
GET /api/products?category=Malt
GET /api/products?category=Nuts&excludeOutOfStock=true
```

---

## 4. Fetch Particular Product Using Product ID

**Endpoint:** `GET /api/products/{slug}`

**Description:** Single product details using product slug (unique identifier).

**Path Parameters:**
- `slug` (string, required): Product slug (e.g., "almond-elephant-250g")

**Response:**
```json
{
  "product": {
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
    "image": "string",
    "variants": [
      {
        "id": "string",
        "sizeGrams": "number",
        "price": "number",
        "stock": "number",
        "inStock": "boolean"
      }
    ]
  }
}
```

**Authentication:** Public (no auth required)

**Error Response (404):**
```json
{
  "error": "Product not found"
}
```

**Example:**
```
GET /api/products/almond-elephant-250g
```

---

## 5. Search All Products Using Product Name

**Endpoint:** `GET /api/products/search?q={searchTerm}`

**Description:** Listing of products matching the name (case-insensitive partial match).

**Query Parameters:**
- `q` or `search` (string, required): Search query for product name
- `category` (string, optional): Filter results by category
- `excludeOutOfStock` (boolean, optional): Filter out products with no stock

**Response:**
```json
{
  "products": [
    {
      "id": "string",
      "name": "string",
      "slug": "string",
      "description": "string",
      "price": "number",
      "category": "string",
      "stock": "number",
      "inStock": "boolean",
      ...
    }
  ],
  "query": "almond",
  "count": 5
}
```

**Authentication:** Public (no auth required)

**Notes:**
- Results are limited to 50 products for performance
- Search is case-insensitive and matches partial names
- Results are sorted alphabetically by product name

**Examples:**
```
GET /api/products/search?q=almond
GET /api/products/search?search=powder
GET /api/products/search?q=malt&category=Malt
GET /api/products/search?q=cashew&excludeOutOfStock=true
```

---

## Quick Reference

| # | Endpoint | Purpose | Required Params |
|---|----------|---------|-----------------|
| 1 | `GET /api/products` | List all products | None |
| 2 | `GET /api/categories` | List all categories | None |
| 3 | `GET /api/products?category=X` | Products in category | `category` |
| 4 | `GET /api/products/{slug}` | Single product | `slug` (path) |
| 5 | `GET /api/products/search?q=X` | Search products | `q` or `search` |

---

## Common Features

All 5 APIs share these characteristics:

✅ **Public Access** - No authentication required  
✅ **Active Products Only** - Only returns products with `isActive = true`  
✅ **JSON Response** - All responses in JSON format  
✅ **Variant Support** - Automatic handling of variant-based products (Malt, Saadha Podi)  
✅ **Image Discovery** - Automatic fallback to discovered product images  
✅ **Caching** - Responses are cached for optimal performance  

---

## Base URL

**Development:** `http://localhost:3000`  
**Production:** `https://milletsnjot.com`

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (product doesn't exist)
- `500` - Server Error

Error response format:
```json
{
  "error": "Error message description"
}
```
