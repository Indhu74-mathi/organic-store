'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { calculateDiscountedPrice } from '@/lib/pricing'

interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  discountPercent: number | null
  imageUrl: string
  category: string
  stock: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface AdminProductsListProps {
  accessToken: string | null
}

export default function AdminProductsList({ accessToken }: AdminProductsListProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [editing, setEditing] = useState<{ productId: string; field: 'name' | 'description' | 'price' | 'stock' | 'discount' } | null>(null)

  useEffect(() => {
    if (!accessToken) return

    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/admin/products?includeInactive=true', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = 'Failed to load products'
          try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorMessage
            console.error('[Admin Products] API Error:', errorData)
          } catch {
            // If response is not JSON, use status text
            errorMessage = `Failed to load products: ${response.status} ${response.statusText}`
            console.error('[Admin Products] HTTP Error:', response.status, response.statusText)
          }
          
          // Show specific error messages
          if (response.status === 403) {
            errorMessage = 'Access denied. You must be an admin to view products.'
          } else if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in again.'
          }
          
          setError(errorMessage)
          setIsLoading(false)
          return
        }

        const data = await response.json()
        console.log('[Admin Products] API Response:', data)
        console.log('[Admin Products] Products array:', data.products)
        console.log('[Admin Products] Products count:', data.products?.length || 0)
        
        // Ensure products is always an array
        const productsArray = Array.isArray(data.products) ? data.products : []
        setProducts(productsArray)
        setError(null) // Clear any previous errors
      } catch (err) {
        console.error('[Admin Products] Fetch Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load products. Please check your connection and try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [accessToken])

  const handleToggleActive = async (product: Product) => {
    if (!accessToken) return

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          isActive: !product.isActive,
        }),
      })

      if (!response.ok) {
        alert('Failed to update product')
        return
      }

      // Refresh products list
      await refreshProducts()
    } catch (err) {
      console.error('[Admin Products]', err)
      alert('Failed to update product')
    }
  }

  const handleUpdateProduct = async (
    productId: string,
    updates: { name?: string; description?: string; price?: number; stock?: number; discountPercent?: number | null }
  ) => {
    if (!accessToken) {
      console.error('[Admin Products] No access token available')
      alert('Authentication required. Please log in again.')
      return
    }

    try {
      const updateData: Record<string, unknown> = {}
      if (updates.name !== undefined) {
        updateData.name = updates.name.trim()
      }
      if (updates.description !== undefined) {
        updateData.description = updates.description.trim()
      }
      if (updates.price !== undefined) {
        updateData.price = updates.price
      }
      if (updates.stock !== undefined) {
        updateData.stock = updates.stock
      }
      if (updates.discountPercent !== undefined) {
        updateData.discountPercent = updates.discountPercent
      }

      // Don't make API call if no updates
      if (Object.keys(updateData).length === 0) {
        console.log('[Admin Products] No updates to apply')
        setEditing(null)
        return
      }

      console.log('[Admin Products] Updating product:', productId, updateData)

      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        let errorMsg = 'Failed to update product'
        try {
          const data = await response.json()
          errorMsg = data.message || errorMsg
        } catch {
          errorMsg = `Failed to update product: ${response.status} ${response.statusText}`
        }
        console.error('[Admin Products] Update failed:', errorMsg, response.status)
        alert(errorMsg)
        return
      }

      const result = await response.json()
      console.log('[Admin Products] Update successful:', result)

      // Clear editing state first
      setEditing(null)
      
      // Refresh products list
      await refreshProducts()
    } catch (err) {
      console.error('[Admin Products] Update error:', err)
      alert('Failed to update product. Please check your connection and try again.')
      setEditing(null)
    }
  }

  const handleBulkActivate = async () => {
    if (!accessToken) return

    if (!confirm('This will activate all products and set stock to 100 for products with 0 stock. Continue?')) {
      return
    }

    setIsActivating(true)
    try {
      const response = await fetch('/api/admin/products/bulk-activate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.message || 'Failed to activate products')
        return
      }

      const data = await response.json()
      alert(data.message || 'All products activated successfully')
      await refreshProducts()
    } catch (err) {
      console.error('[Admin Products]', err)
      alert('Failed to activate products')
    } finally {
      setIsActivating(false)
    }
  }

  const refreshProducts = async () => {
    if (!accessToken) return

    try {
      const productsResponse = await fetch('/api/admin/products?includeInactive=true', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (productsResponse.ok) {
        const data = await productsResponse.json()
        const productsArray = Array.isArray(data.products) ? data.products : []
        setProducts(productsArray)
      }
    } catch (err) {
      console.error('[Admin Products]', err)
    }
  }

  const handleImportStaticProducts = async () => {
    if (!accessToken) return

    if (!confirm('This will import all static products from the shop into the database. Continue?')) {
      return
    }

    setIsImporting(true)
    try {
      const response = await fetch('/api/admin/products/import-static', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.message || 'Failed to import products')
        return
      }

      const data = await response.json()
      alert(data.message || `Successfully imported ${data.imported} products`)
      await refreshProducts()
    } catch (err) {
      console.error('[Admin Products]', err)
      alert('Failed to import products')
    } finally {
      setIsImporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
          <p className="text-sm text-neutral-600">Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Error loading products</p>
          <p className="mt-1">{error}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setError(null)
              setIsLoading(true)
              if (accessToken) {
                try {
                  const response = await fetch('/api/admin/products?includeInactive=true', {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  })

                  if (!response.ok) {
                    let errorMessage = 'Failed to load products'
                    try {
                      const errorData = await response.json()
                      errorMessage = errorData.message || errorMessage
                    } catch {
                      errorMessage = `Failed to load products: ${response.status} ${response.statusText}`
                    }
                    
                    if (response.status === 403) {
                      errorMessage = 'Access denied. You must be an admin to view products.'
                    } else if (response.status === 401) {
                      errorMessage = 'Authentication required. Please log in again.'
                    }
                    
                    setError(errorMessage)
                    setIsLoading(false)
                    return
                  }

                  const data = await response.json()
                  const productsArray = Array.isArray(data.products) ? data.products : []
                  setProducts(productsArray)
                  setError(null)
                } catch (err) {
                  console.error('[Admin Products]', err)
                  setError(err instanceof Error ? err.message : 'Failed to load products')
                } finally {
                  setIsLoading(false)
                }
              }
            }}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {showAddForm ? 'Cancel' : '+ Add Product'}
          </button>
          <button
            onClick={handleBulkActivate}
            disabled={isActivating}
            className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isActivating ? 'Activating...' : 'Make All Products Available'}
          </button>
          <button
            onClick={handleImportStaticProducts}
            disabled={isImporting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : 'Import Shop Products'}
          </button>
        </div>
        <div className="text-sm text-neutral-600">
          {products.length} product{products.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <AddProductForm
          accessToken={accessToken}
          onSuccess={() => {
            setShowAddForm(false)
            refreshProducts()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Products Table or Empty State */}
      {products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-neutral-600">No products found.</p>
          <p className="mt-2 text-xs text-neutral-500">
            Click &quot;+ Add Product&quot; to create your first product, or &quot;Make All Products Available&quot; to activate existing products.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Discount (%)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-6 py-4">
                  {editing?.productId === product.id && editing.field === 'name' ? (
                    <input
                      type="text"
                      defaultValue={product.name}
                      onBlur={async (e) => {
                        const inputValue = e.target.value.trim()
                        if (inputValue === '') {
                          setEditing(null)
                          return
                        }
                        if (inputValue !== product.name) {
                          await handleUpdateProduct(product.id, { name: inputValue })
                        } else {
                          setEditing(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditing(null)
                        }
                      }}
                      onFocus={(e) => {
                        e.currentTarget.select()
                      }}
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-sm font-medium focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="text-sm font-medium text-neutral-900">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditing({ productId: product.id, field: 'name' })
                          }}
                          className="hover:text-primary-600 transition-colors cursor-pointer text-left"
                        >
                          {product.name}
                        </button>
                      </div>
                      <div className="text-xs text-neutral-500">{product.slug}</div>
                    </>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-neutral-700 max-w-xs">
                  {editing?.productId === product.id && editing.field === 'description' ? (
                    <textarea
                      defaultValue={product.description}
                      onBlur={async (e) => {
                        const inputValue = e.target.value.trim()
                        if (inputValue === '') {
                          setEditing(null)
                          return
                        }
                        if (inputValue !== product.description) {
                          await handleUpdateProduct(product.id, { description: inputValue })
                        } else {
                          setEditing(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditing(null)
                        }
                        // Allow Ctrl+Enter or Cmd+Enter to save
                        if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      onFocus={(e) => {
                        e.currentTarget.select()
                      }}
                      rows={3}
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-y"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditing({ productId: product.id, field: 'description' })
                      }}
                      className="hover:text-primary-600 transition-colors cursor-pointer text-left w-full"
                    >
                      <p className="line-clamp-2 text-neutral-600">
                        {product.description || '—'}
                      </p>
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">
                  {product.category}
                </td>
                <td className="px-6 py-4 text-sm">
                  {editing?.productId === product.id && editing.field === 'price' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-500">₹</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        defaultValue={product.price}
                        onBlur={async (e) => {
                          const inputValue = e.target.value.trim()
                          if (inputValue === '') {
                            setEditing(null)
                            return
                          }
                          const newPrice = parseFloat(inputValue)
                          if (!isNaN(newPrice) && newPrice > 0) {
                            if (newPrice !== product.price) {
                              await handleUpdateProduct(product.id, { price: newPrice })
                            }
                            setEditing(null)
                          } else {
                            setEditing(null)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            e.currentTarget.blur()
                          } else if (e.key === 'Escape') {
                            e.preventDefault()
                            setEditing(null)
                          }
                        }}
                        onFocus={(e) => {
                          e.currentTarget.select()
                        }}
                        className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditing({ productId: product.id, field: 'price' })
                      }}
                        className="hover:text-primary-600 transition-colors cursor-pointer text-left"
                    >
                        {product.discountPercent && product.discountPercent > 0 ? (
                          <>
                            <span className="text-neutral-400 line-through text-xs">
                      ₹{product.price.toFixed(2)}
                            </span>
                            <span className="block text-neutral-900 font-semibold">
                              ₹{(
                                calculateDiscountedPrice(product.price * 100, product.discountPercent) / 100
                              ).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-neutral-900 font-semibold">
                            ₹{product.price.toFixed(2)}
                          </span>
                        )}
                    </button>
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900">
                  {editing?.productId === product.id && editing.field === 'stock' ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={product.stock}
                      onBlur={async (e) => {
                        const inputValue = e.target.value.trim()
                        if (inputValue === '') {
                          setEditing(null)
                          return
                        }
                        const newStock = parseInt(inputValue, 10)
                        if (!isNaN(newStock) && newStock >= 0) {
                          if (newStock !== product.stock) {
                            await handleUpdateProduct(product.id, { stock: newStock })
                          }
                          setEditing(null)
                        } else {
                          setEditing(null)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditing(null)
                        }
                      }}
                      onFocus={(e) => {
                        e.currentTarget.select()
                      }}
                      className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditing({ productId: product.id, field: 'stock' })
                      }}
                      className="hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      {product.stock}
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  {editing?.productId === product.id && editing.field === 'discount' ? (
                    <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      defaultValue={product.discountPercent ?? 0}
                      onBlur={async (e) => {
                        const inputValue = e.target.value.trim()
                        if (inputValue === '') {
                          // Empty value → save as null (remove discount)
                          await handleUpdateProduct(product.id, { discountPercent: null })
                          setEditing(null)
                          return
                        }
                        let discountValue = parseInt(inputValue, 10)
                        if (isNaN(discountValue)) {
                          setEditing(null)
                          return
                        }
                        // Clamp value between 0 and 100
                        discountValue = Math.max(0, Math.min(100, discountValue))
                        // 0 → save as null (no discount)
                        const valueToSave = discountValue === 0 ? null : discountValue
                        const currentDiscount = product.discountPercent ?? null
                        if (valueToSave !== currentDiscount) {
                          await handleUpdateProduct(product.id, { discountPercent: valueToSave })
                        }
                        setEditing(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          setEditing(null)
                        }
                      }}
                      onFocus={(e) => {
                        e.currentTarget.select()
                      }}
                        className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      autoFocus
                    />
                      <span className="text-neutral-500 text-xs">%</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditing({ productId: product.id, field: 'discount' })
                      }}
                      className="hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      {product.discountPercent && product.discountPercent > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-1 text-xs font-semibold text-primary-700">
                          {product.discountPercent}%
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </button>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      product.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm">
                  <div className="flex items-center gap-2">
                    {editing?.productId === product.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setEditing(null)
                        }}
                        className="rounded-full px-3 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        product.isActive
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
      )}
    </div>
  )
}

// Add Product Form Component
function AddProductForm({
  accessToken,
  onSuccess,
  onCancel,
}: {
  accessToken: string | null
  onSuccess: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    category: '',
    stock: '100',
    isActive: true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setFormData((prev) => ({ ...prev, slug }))
    }
  }, [formData.name])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return

    setError(null)
    setIsSubmitting(true)

    try {
      let imageUrl = ''

      // Upload image first if provided
      if (imageFile) {
        const imageFormData = new FormData()
        imageFormData.append('image', imageFile)
        imageFormData.append('category', formData.category || 'misc')

        const uploadResponse = await fetch('/api/admin/products/upload-image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: imageFormData,
        })

        if (!uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          throw new Error(uploadData.message || 'Failed to upload image')
        }

        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.imageUrl
      }

      // Create product
      const productData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        imageUrl: imageUrl || '/products/misc/placeholder.jpg',
        category: formData.category.trim() || 'Misc',
        stock: parseInt(formData.stock, 10) || 0,
        isActive: formData.isActive,
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to create product')
      }

      // Reset form
      setFormData({
        name: '',
        slug: '',
        description: '',
        price: '',
        category: '',
        stock: '100',
        isActive: true,
      })
      setImageFile(null)
      setImagePreview(null)
      onSuccess()
    } catch (err) {
      console.error('[Add Product]', err)
      setError(err instanceof Error ? err.message : 'Failed to create product')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">Add New Product</h2>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., Organic Brown Rice"
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-neutral-700">
              Slug (URL-friendly)
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="auto-generated from name"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Detailed product description..."
            />
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-neutral-700">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="price"
              required
              min="0.01"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-neutral-700">
              Category <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="e.g., Malt, Millets"
            />
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-neutral-700">
              Stock Quantity
            </label>
            <input
              type="number"
              id="stock"
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="100"
            />
          </div>

          <div>
            <label htmlFor="image" className="block text-sm font-medium text-neutral-700">
              Product Image <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              id="image"
              required
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              className="mt-1 block w-full text-sm text-neutral-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
            {imagePreview && (
              <div className="mt-2 relative h-32 w-32">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  className="rounded-md border border-neutral-300 object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-neutral-700">
              Product is active (visible in shop)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

