import type { Metadata } from 'next'
import ProductDetailPageContent from '@/components/shop/ProductDetailPageContent'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { hasVariants } from '@/lib/products'

// Prevent caching to ensure fresh product data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ProductSlugPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({
  params,
}: ProductSlugPageProps): Promise<Metadata> {
  const { data: products } = await supabase
    .from('Product')
    .select('*')
    .eq('slug', params.slug)
    .eq('isActive', true)
    .limit(1)

  const product = products && products.length > 0 ? products[0] : null

  if (!product) {
    return {
      title: 'Product not found | Millets N Joy',
      description:
        'This product could not be found. It may have been moved or is no longer available.',
    }
  }

  const baseTitle = `${product.name} | Millets N Joy`
  const description = product.description || `Buy ${product.name} at Millets N Joy`

  return {
    title: baseTitle,
    description,
    openGraph: {
      title: baseTitle,
      description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  }
}

export default async function ProductSlugPage({ params }: ProductSlugPageProps) {
  // Decode the slug parameter (handles URL encoding like %20 for spaces)
  const decodedSlug = decodeURIComponent(params.slug)

  // Fetch product first (without nested query to avoid Supabase issues)
  // Try exact match first, then case-insensitive match if needed
  const { data: products, error: productError } = await supabase
    .from('Product')
    .select(`
      id,
      name,
      slug,
      description,
      price,
      discountPercent,
      imageUrl,
      category,
      stock,
      isActive
    `)
    .eq('isActive', true)

  if (productError) {
    console.error('[Product Slug Page] Supabase error:', productError)
    notFound()
  }

  if (!products || products.length === 0) {
    notFound()
  }

  // Find product by slug (case-insensitive comparison to handle slug variations)
  const product = products.find(
    (p) => p.slug?.toLowerCase().trim() === decodedSlug.toLowerCase().trim() ||
      p.slug === decodedSlug ||
      p.name?.toLowerCase().trim() === decodedSlug.toLowerCase().trim()
  )

  interface DBVariant {
    id: string
    sizeGrams: number
    price: number
    stock: number
  }

  interface DBProduct {
    id: string
    slug: string
    name: string
    description: string
    price: number
    discountPercent: number
    imageUrl: string
    category: string
    stock: number
    isActive: boolean
  }

  // ... existing code ...

  if (!product) {
    notFound()
  }

  const productData = product as DBProduct
  const usesVariants = hasVariants(productData.category)

  // Fetch variants separately if this product uses variants
  let variants: DBVariant[] = []
  if (usesVariants) {
    const { data: variantData, error: variantError } = await supabase
      .from('ProductVariant')
      .select('id, sizeGrams, price, stock')
      .eq('productId', productData.id)
      .order('sizeGrams', { ascending: true })

    if (variantError) {
      console.error('[Product Slug Page] Variant fetch error:', variantError)
      // Don't fail the page if variants fail - just use empty array
    } else {
      variants = (variantData as DBVariant[]) || []
    }
  }

  // For variant-based products: check if any variant has stock
  // For non-variant products: use product stock
  let inStock: boolean
  let stock: number

  if (usesVariants) {
    const hasStock = variants.some((v) => v.stock > 0)
    const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0)
    inStock = productData.isActive && hasStock
    stock = totalStock
  } else {
    inStock = productData.isActive && productData.stock > 0
    stock = productData.stock
  }

  // Map to Product type expected by component
  // Get additional images from filesystem
  const { getProductImages } = await import('@/lib/products-server')
  const extraImages = getProductImages(productData.category, productData.name, productData.imageUrl)

  // Trust the server utility to handle main image and gallery discovery
  const allImages = extraImages.filter(Boolean) as string[]

  const mappedProduct = {
    id: productData.id,
    slug: productData.slug,
    name: productData.name,
    description: productData.description,
    price: productData.price / 100, // Convert paise to rupees
    discountPercent: productData.discountPercent,
    category: productData.category,
    image: allImages[0] || productData.imageUrl,
    images: allImages,
    inStock: inStock,
    stock: stock,
    // Include variants for variant-based products
    ...(usesVariants && {
      variants: variants.map((v) => ({
        id: v.id,
        sizeGrams: v.sizeGrams,
        price: v.price / 100, // Convert paise to rupees
        stock: v.stock,
        inStock: v.stock > 0,
      })),
    }),
  }

  // Create JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productData.name,
    image: productData.imageUrl ? [productData.imageUrl] : [],
    description: productData.description,
    sku: productData.id,
    brand: {
      '@type': 'Brand',
      name: 'Millets N Joy',
    },
    offers: {
      '@type': 'Offer',
      url: `https://milletsnjoy.com/shop/${productData.slug}`,
      priceCurrency: 'INR',
      price: (productData.price / 100).toFixed(2),
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Millets N Joy',
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailPageContent product={mappedProduct} />
    </>
  )
}
