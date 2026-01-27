
// Map of product names/slugs to cinematic images
export const productImageMap: Record<string, string> = {
    // Existing Hero Images
    'abc nutri mix': '/hero-images/abc-mix-v2.png',
    'red banana malt': '/hero-images/red-banana-v2.png',
    'chilli chatag': '/hero-images/chilli-chatag-v2.png',
    'choco ragi': '/hero-images/choco-ragi-v2.png',
    'masala stick': '/hero-images/masala-stick-v2.png',
    'tangy tomato': '/hero-images/tangy-tomato-v2.png',

    // New Cinematic Images
    'nuts boost': '/hero-images/nuts-boost-cinematic.png',
    'nutty beets': '/hero-images/nutty-beets-cinematic.png',
    'mudavaattu kizhangu saadha podi': '/hero-images/mudavaattu-kizhangu-cinematic.png',
    'almond elephant': '/hero-images/almond-elephant-cinematic.png',
    'choco coated monkey': '/hero-images/choco-monkey-cinematic.png',
    'multi millet choco coated balls': '/hero-images/choco-monkey-cinematic.png', // Added specific mapping
    'monkey': '/hero-images/choco-monkey-cinematic.png', // Fallback for shortened name
    'choco monkey': '/hero-images/choco-monkey-cinematic.png', // Fallback for user-style name
    'coconut hearts': '/hero-images/coconut-hearts-cinematic.png', // This will be the new bottle version
    'premium peanut balls': '/hero-images/peanut-balls-cinematic.png',
    'peanut balls': '/hero-images/peanut-balls-cinematic.png', // Fallback
}

/**
 * Helper to get the cinematic image for a product if available,
 * otherwise returns the original product image.
 */
export function getCinematicImage(product: { name: string; image: string } | undefined | null): string {
    if (!product) return ''

    const normalizedName = product.name.toLowerCase().trim()

    // Check for exact match or partial match for mapped images
    for (const [key, value] of Object.entries(productImageMap)) {
        if (normalizedName.includes(key)) {
            return value
        }
    }

    return product.image
}
