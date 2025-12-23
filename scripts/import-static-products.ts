/**
 * Script to import static products from lib/products.ts into the database
 * 
 * Run with: npx tsx scripts/import-static-products.ts
 */

import { PrismaClient } from '@prisma/client'
import { products } from '../lib/products'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting product import...')
  console.log(`Found ${products.length} products in static data`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const product of products) {
    try {
      // Check if product with this slug already exists
      const existing = await prisma.product.findUnique({
        where: { slug: product.slug },
      })

      if (existing) {
        console.log(`⏭️  Skipping ${product.name} (slug already exists: ${product.slug})`)
        skipped++
        continue
      }

      // Convert price from rupees to paise (smallest currency unit)
      const priceInPaise = Math.round(product.price * 100)

      // Create product in database
      const created = await prisma.product.create({
        data: {
          name: product.name,
          slug: product.slug || product.name.toLowerCase().replace(/\s+/g, '-'),
          description: product.description || '',
          price: priceInPaise,
          imageUrl: product.image || '/images/placeholders/product-placeholder.jpg',
          category: product.category,
          stock: 100, // Default stock
          isActive: true, // Make all products active
        },
      })

      console.log(`✅ Imported: ${created.name} (${created.slug})`)
      imported++
    } catch (error) {
      console.error(`❌ Error importing ${product.name}:`, error)
      errors++
    }
  }

  console.log('\n📊 Import Summary:')
  console.log(`   ✅ Imported: ${imported}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   📦 Total: ${products.length}`)
}

main()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

