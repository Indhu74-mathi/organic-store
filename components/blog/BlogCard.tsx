import Link from 'next/link'
import Image from 'next/image'
import { BlogPost } from '@/lib/blog-data'

interface BlogCardProps {
    post: BlogPost
}

/**
 * BlogCard Component
 * 
 * Displays a blog post card with image, title, tagline, and metadata.
 * Both the image and title/tagline serve as clickable links to the full post.
 */
export default function BlogCard({ post }: BlogCardProps) {
    const formattedDate = new Date(post.publishedDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary-300">
            {/* Hero Image - Clickable */}
            <Link href={`/blog/${post.slug}`} className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                <Image
                    src={post.heroImage}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                />
                {/* Category Badge */}
                <div className="absolute top-2 left-2 sm:top-4 sm:left-4 rounded-full bg-primary-600 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-white shadow-md">
                    {post.category}
                </div>
            </Link>

            {/* Content */}
            <div className="flex flex-1 flex-col p-3 sm:p-6">
                {/* Title - Clickable */}
                <Link href={`/blog/${post.slug}`} className="group/title">
                    <h2 className="mb-1 sm:mb-2 text-sm sm:text-xl font-bold text-neutral-900 transition-colors duration-200 group-hover/title:text-primary-600 line-clamp-2">
                        {post.title}
                    </h2>
                </Link>

                {/* Tagline - Clickable */}
                <Link href={`/blog/${post.slug}`} className="group/tagline">
                    <p className="mb-2 sm:mb-4 text-xs sm:text-sm font-medium text-primary-600 transition-colors duration-200 group-hover/tagline:text-primary-700">
                        {post.tagline}
                    </p>
                </Link>

                {/* Excerpt - Hidden on mobile to save space, visible on tablet+ */}
                <p className="hidden sm:block mb-4 flex-1 text-sm text-neutral-600 line-clamp-3">
                    {post.excerpt}
                </p>

                {/* Metadata */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2 sm:pt-4 text-[10px] sm:text-xs text-neutral-500">
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formattedDate}
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {post.readingTime} min read
                        </span>
                    </div>

                    {/* Read More Link */}
                    <Link
                        href={`/blog/${post.slug}`}
                        className="font-semibold text-primary-600 transition-colors duration-200 hover:text-primary-700 whitespace-nowrap"
                    >
                        Read<span className="hidden sm:inline"> More</span> →
                    </Link>
                </div>
            </div>
        </article>
    )
}
