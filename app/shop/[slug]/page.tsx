import type { Metadata } from 'next'
import ProductDetailPageContent from '@/components/shop/ProductDetailPageContent'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'

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
  const { data: products } = await supabase
    .from('Product')
    .select('*')
    .eq('slug', params.slug)
    .eq('isActive', true)
    .limit(1)

  const product = products && products.length > 0 ? products[0] : null

  if (!product) {
    notFound()
  }

  // Map to Product type expected by component
  // Use same logic as cart routes: inStock = isActive && stock > 0
  const mappedProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price / 100, // Convert paise to rupees - SAME as cart
    discountPercent: product.discountPercent, // SAME as cart
    category: product.category,
    image: product.imageUrl,
    inStock: product.isActive && product.stock > 0, // SAME logic as cart
    stock: product.stock, // SAME as cart
  }

  return <ProductDetailPageContent product={mappedProduct} />
}
