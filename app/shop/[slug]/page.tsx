import type { Metadata } from 'next'
import ProductDetailPageContent from '@/components/shop/ProductDetailPageContent'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

interface ProductSlugPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({
  params,
}: ProductSlugPageProps): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: {
      slug: params.slug,
      isActive: true,
    },
  })

  if (!product) {
    return {
      title: 'Product not found | Millets N Joy',
      description:
        'This product could not be found. It may have been moved or is no longer available.',
    }
  }

  const baseTitle = `${product.name} | Millets N Joy`

  const description =
    product.description.length > 150
      ? `${product.description.slice(0, 147)}...`
      : product.description

  return {
    title: baseTitle,
    description,
    openGraph: {
      title: baseTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: baseTitle,
      description,
    },
  }
}

export default async function ProductSlugPage({ params }: ProductSlugPageProps) {
  const product = await prisma.product.findUnique({
    where: {
      slug: params.slug,
      isActive: true,
    },
  })

  if (!product) {
    notFound()
  }

  // Map database product to Product type
  const mappedProduct = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price / 100, // Convert to rupees
    discountPercent: product.discountPercent,
    category: product.category,
    image: product.imageUrl,
    inStock: product.stock > 0,
    stock: product.stock, // Include stock for low stock warnings
  }

  return <ProductDetailPageContent product={mappedProduct} />
}


