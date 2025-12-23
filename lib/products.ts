import type { Product } from '@/types'

/**
 * Helper function to get product image path based on category
 * Maps category to image folder and selects image by product index
 */
function getProductImage(category: string, productIndex: number): string {
  const categoryLower = category.toLowerCase()
  
  // Map categories to image folders
  if (categoryLower === 'malt') {
    const maltImages: readonly string[] = [
      '/products/malt/ABC Nutri Mix.png',
      '/products/malt/Choco Ragi Millet.png',
      '/products/malt/Mudavaattu Kizhangu saadha podi.png',
      '/products/malt/Nuts Boost.png',
      '/products/malt/Nutty Beets.jpeg',
      '/products/malt/Red Banana Malt.png',
    ]
    const index = productIndex % maltImages.length
    const image = maltImages[index]
    return image ?? maltImages[0]!
  }
  
  if (categoryLower === 'millets') {
    const milletImages: readonly string[] = [
      '/products/millets/Chilli Chatag.jpg',
      '/products/millets/Choco coated monkey new.jpg',
      '/products/millets/Coconut Hearts.jpg',
      '/products/millets/Masala stick.jpg',
      '/products/millets/Millet n Joy elephant.jpg',
      '/products/millets/PEANUT BALLS.jpg',
      '/products/millets/Tangy Tomato.jpg',
    ]
    const index = productIndex % milletImages.length
    const image = milletImages[index]
    return image ?? milletImages[0]!
  }
  
  // Fallback for other categories (keep placeholder path)
  return '/images/placeholders/product-placeholder.jpg'
}

/**
 * Shared product data
 * Reuse across home and shop pages until a real backend is connected.
 */
export const products: Product[] = [
  {
    id: '1',
    slug: 'organic-fresh-strawberries',
    name: 'Organic Fresh Strawberries',
    description: 'Sweet, juicy strawberries grown without pesticides.',
    price: 8.99,
    originalPrice: 12.99,
    category: 'Malt',
    image: getProductImage('Malt', 0),
    inStock: true,
    rating: 4.8,
  },
  {
    id: '2',
    slug: 'farm-fresh-organic-eggs',
    name: 'Farm Fresh Organic Eggs',
    description: 'Free-range eggs from pasture-raised hens on small family farms.',
    price: 6.49,
    category: 'Malt',
    image: getProductImage('Malt', 1),
    inStock: true,
    rating: 4.9,
  },
  {
    id: '3',
    slug: 'organic-baby-spinach',
    name: 'Organic Baby Spinach',
    description: 'Tender, nutrient-rich spinach leaves picked at peak freshness.',
    price: 4.99,
    category: 'Malt',
    image: getProductImage('Malt', 2),
    inStock: true,
    rating: 4.7,
  },
  {
    id: '4',
    slug: 'organic-whole-wheat-bread',
    name: 'Organic Whole Wheat Bread',
    description: 'Artisan loaf made with stone-ground organic whole wheat flour.',
    price: 5.99,
    category: 'Malt',
    image: getProductImage('Malt', 3),
    inStock: true,
    rating: 4.6,
  },
  {
    id: '5',
    slug: 'raw-organic-wildflower-honey',
    name: 'Raw Organic Wildflower Honey',
    description: 'Unfiltered honey sourced from organic wildflower meadows.',
    price: 12.99,
    category: 'Malt',
    image: getProductImage('Malt', 4),
    inStock: true,
    rating: 4.9,
  },
  {
    id: '6',
    slug: 'organic-avocados',
    name: 'Organic Avocados',
    description: 'Creamy, ripe Hass avocados perfect for salads and toast.',
    price: 7.99,
    category: 'Malt',
    image: getProductImage('Malt', 5),
    inStock: true,
    rating: 4.8,
  },
  {
    id: '7',
    slug: 'organic-tri-color-quinoa',
    name: 'Organic Tri-Color Quinoa',
    description: 'Protein-rich quinoa blend, ideal for bowls and salads.',
    price: 9.99,
    category: 'Millets',
    image: getProductImage('Millets', 0),
    inStock: true,
    rating: 4.7,
  },
  {
    id: '8',
    slug: 'organic-greek-yogurt',
    name: 'Organic Greek Yogurt',
    description: 'Thick, creamy yogurt made with organic milk and live cultures.',
    price: 5.49,
    category: 'Millets',
    image: getProductImage('Millets', 1),
    inStock: true,
    rating: 4.8,
  },
  {
    id: '9',
    slug: 'premium-organic-coconut-snacks',
    name: 'Premium Organic Coconut Snacks',
    description: 'Delicious coconut-based treats made with organic ingredients and natural flavors.',
    price: 6.99,
    originalPrice: 9.99,
    category: 'Millets',
    image: getProductImage('Millets', 2),
    inStock: true,
    rating: 4.6,
  },
  {
    id: '10',
    slug: 'spiced-millet-sticks',
    name: 'Spiced Millet Sticks',
    description: 'Crispy millet sticks seasoned with traditional spices for a flavorful snack experience.',
    price: 4.49,
    category: 'Millets',
    image: getProductImage('Millets', 3),
    inStock: true,
    rating: 4.5,
  },
  {
    id: '11',
    slug: 'organic-millet-elephant-shapes',
    name: 'Organic Millet Elephant Shapes',
    description: 'Fun-shaped millet snacks perfect for kids, made with wholesome organic ingredients.',
    price: 5.99,
    category: 'Millets',
    image: getProductImage('Millets', 4),
    inStock: true,
    rating: 4.7,
  },
  {
    id: '12',
    slug: 'organic-peanut-balls',
    name: 'Organic Peanut Balls',
    description: 'Nutritious peanut-based millet balls packed with protein and natural goodness.',
    price: 7.49,
    originalPrice: 10.99,
    category: 'Millets',
    image: getProductImage('Millets', 5),
    inStock: true,
    rating: 4.8,
  },
  {
    id: '13',
    slug: 'tangy-tomato-millet-snacks',
    name: 'Tangy Tomato Millet Snacks',
    description: 'Zesty tomato-flavored millet snacks with a perfect balance of tanginess and crunch.',
    price: 4.99,
    category: 'Millets',
    image: getProductImage('Millets', 6),
    inStock: true,
    rating: 4.6,
  },
]


