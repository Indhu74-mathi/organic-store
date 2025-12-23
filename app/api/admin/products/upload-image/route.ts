import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { requireAdmin, createErrorResponse, forbiddenResponse } from '@/lib/auth/api-auth'
import { checkRateLimit, getClientIdentifier } from '@/lib/auth/rate-limit'

/**
 * POST /api/admin/products/upload-image
 * 
 * Upload a product image.
 * 
 * SECURITY:
 * - Admin-only access
 * - Rate limited
 * - File size and type validation
 * 
 * Request: multipart/form-data with 'image' field
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit image uploads (20 per minute per IP)
    const clientId = getClientIdentifier(req)
    const rateLimit = checkRateLimit(`admin:products:upload:${clientId}`, 20, 60 * 1000)
    if (!rateLimit.allowed) {
      return createErrorResponse('Too many requests. Please try again later.', 429)
    }

    // SECURITY: Require admin role
    const admin = requireAdmin(req)
    if (!admin) {
      return forbiddenResponse()
    }

    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return createErrorResponse('No image file provided', 400)
    }

    // SECURITY: Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return createErrorResponse('Invalid file type. Only JPEG, PNG, and WebP are allowed.', 400)
    }

    // SECURITY: Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return createErrorResponse('File size too large. Maximum size is 5MB.', 400)
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop() || 'jpg'
    const filename = `product-${timestamp}-${randomString}.${extension}`

    // Determine category folder (default to 'misc')
    const category = formData.get('category') as string || 'misc'
    const categoryFolder = category.toLowerCase().replace(/\s+/g, '-')

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'products', categoryFolder)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const filePath = join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Return public URL
    const imageUrl = `/products/${categoryFolder}/${filename}`

    return NextResponse.json({
      success: true,
      imageUrl,
      filename,
    })
  } catch (error) {
    return createErrorResponse('Failed to upload image', 500, error)
  }
}

