import fs from 'fs'
import path from 'path'

/**
 * Discovers additional images for a product based on its category, name, and main image.
 * 
 * Convention:
 * - If main image is "Nuts Boost.png", look for extra images in folder "Nuts_Boost"
 *   in the same directory as the main image.
 */
export function getProductImages(category: string, name: string, mainImageUrl?: string): string[] {
    const images: string[] = []
    const publicDir = path.join(process.cwd(), 'public')
    const productsRoot = path.join(publicDir, 'products')

    if (!fs.existsSync(productsRoot)) return mainImageUrl ? [mainImageUrl] : []

    const availableCategories = fs.readdirSync(productsRoot)

    // Clean tokens from product name (3+ chars, alphanumeric only)
    const nameTokens = name.toLowerCase().split(/[\s_\-\.]+/).filter(t => t.length > 3).map(t => t.replace(/[^a-z0-9]/g, ''))

    let bestMainImage: string | null = null
    let bestBaseDir: string | null = null
    let bestFileNameBase: string | null = null

    // 1. Validate DB URL
    if (mainImageUrl && mainImageUrl.startsWith('/')) {
        const absPath = path.join(publicDir, mainImageUrl.substring(1))
        if (fs.existsSync(absPath) && !fs.statSync(absPath).isDirectory()) {
            bestMainImage = mainImageUrl
            bestBaseDir = path.dirname(absPath)
            const ext = path.extname(mainImageUrl)
            bestFileNameBase = path.basename(mainImageUrl, ext).trim()
        }
    }

    // 2. Fuzzy Search for Main Image (if DB fails)
    if (!bestMainImage) {
        let highestScore = 0
        for (const cat of availableCategories) {
            const catPath = path.join(productsRoot, cat)
            if (!fs.statSync(catPath).isDirectory()) continue

            const files = fs.readdirSync(catPath).filter(f => !fs.statSync(path.join(catPath, f)).isDirectory())
            for (const f of files) {
                const fTokens = f.toLowerCase().split(/[\s_\-\.]+/).filter(t => t.length > 3).map(t => t.replace(/[^a-z0-9]/g, ''))
                const intersection = nameTokens.filter(t => fTokens.includes(t) || fTokens.some(ft => ft.includes(t) || t.includes(ft)))
                const score = intersection.length

                if (score > highestScore && score >= 1) {
                    highestScore = score
                    bestMainImage = `/products/${cat}/${f}`
                    bestBaseDir = catPath
                    bestFileNameBase = path.basename(f, path.extname(f)).trim()
                }
            }
        }
    }

    // 3. Fallback to category folder if still nothing found
    if (!bestBaseDir) {
        const normalizedCategory = category.toLowerCase().trim().replace(/\s+/g, '_')
        const match = availableCategories.find(f => f.toLowerCase() === normalizedCategory.toLowerCase() || f.toLowerCase() === normalizedCategory.toLowerCase() + 's')
        bestBaseDir = path.join(productsRoot, match || availableCategories[0] || 'malt')
        bestFileNameBase = name.trim()
    }

    // Add the discovered main image
    if (bestMainImage) images.push(bestMainImage)
    else if (mainImageUrl) {
        // Check if broken placeholder worth keeping
        const abs = path.join(publicDir, mainImageUrl.substring(1))
        if (fs.existsSync(abs)) images.push(mainImageUrl)
    }

    // 4. Find Gallery Folder (Token Based)
    if (bestFileNameBase) {
        let galleryDir: string | null = null
        const folderTokens = bestFileNameBase.toLowerCase().split(/[\s_\-\.]+/).filter(t => t.length > 3).map(t => t.replace(/[^a-z0-9]/g, ''))

        // Check locally first
        const exactLocal = path.join(bestBaseDir, bestFileNameBase.replace(/\s+/g, '_'))
        if (fs.existsSync(exactLocal) && fs.statSync(exactLocal).isDirectory()) {
            galleryDir = exactLocal
        } else {
            // Global fuzzy search for folder
            let highestFolderScore = 0
            for (const cat of availableCategories) {
                const catPath = path.join(productsRoot, cat)
                if (!fs.statSync(catPath).isDirectory()) continue

                const subdirs = fs.readdirSync(catPath).filter(f => fs.statSync(path.join(catPath, f)).isDirectory())
                for (const sd of subdirs) {
                    const sdTokens = sd.toLowerCase().split(/[\s_\-\.]+/).filter(t => t.length > 3).map(t => t.replace(/[^a-z0-9]/g, ''))
                    // Intersect with BOTH nameTokens and folderTokens
                    const score = nameTokens.filter(t => sdTokens.includes(t) || sdTokens.some(sdt => sdt.includes(t) || t.includes(sdt))).length +
                        folderTokens.filter(t => sdTokens.includes(t) || sdTokens.some(sdt => sdt.includes(t) || t.includes(sdt))).length

                    if (score > highestFolderScore && score >= 2) { // Need stronger match for folders
                        highestFolderScore = score
                        galleryDir = path.join(catPath, sd)
                    }
                }
            }
        }

        if (galleryDir) {
            try {
                const galleryFiles = fs.readdirSync(galleryDir)
                galleryFiles.forEach(file => {
                    const ext = path.extname(file).toLowerCase()
                    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
                        const relPath = path.relative(publicDir, path.join(galleryDir, file)).replace(/\\/g, '/')
                        images.push('/' + relPath)
                    }
                })
            } catch (err) {
                console.error(`Error reading gallery ${galleryDir}:`, err)
            }
        }
    }

    // Final cleanup: path normalization and deduplication
    return Array.from(new Set(images.map(img => img.startsWith('/') ? img : '/' + img)))
}
