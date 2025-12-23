'use client'

import { useId } from 'react'

interface ShopFiltersProps {
  categories: string[]
  selectedCategories: string[]
  onToggleCategory: (category: string) => void
  onClear: () => void
  variant?: 'mobile' | 'desktop'
}

export default function ShopFilters({
  categories,
  selectedCategories,
  onToggleCategory,
  onClear,
  variant = 'desktop',
}: ShopFiltersProps) {
  const headingId = useId()

  const isSelected = (category: string) => selectedCategories.includes(category)

  const Wrapper: React.ElementType = variant === 'desktop' ? 'aside' : 'div'

  return (
    <Wrapper
      aria-labelledby={headingId}
      className={
        variant === 'desktop'
          ? 'w-full max-w-xs rounded-2xl border border-neutral-200 bg-white/90 p-4 sm:p-5'
          : 'w-full rounded-2xl border border-neutral-200 bg-white/90 p-4 sm:p-5'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p
            id={headingId}
            className="text-sm font-semibold tracking-tight text-neutral-900"
          >
            Filters
          </p>
          <p className="text-xs text-neutral-500">Refine by category</p>
        </div>
        {selectedCategories.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            Clear
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onToggleCategory(category)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-white ${
              isSelected(category)
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </Wrapper>
  )
}
