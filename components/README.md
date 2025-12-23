# Animation Components

This directory contains reusable animation components using Framer Motion.

## Components

### `AnimatedPage`
A reusable wrapper component for individual page content animations.

**Usage:**
```tsx
import AnimatedPage from '@/components/AnimatedPage'

export default function MyPage() {
  return (
    <AnimatedPage>
      <div>Your page content</div>
    </AnimatedPage>
  )
}
```

**Props:**
- `children`: ReactNode - The content to animate
- `className?`: string - Optional additional CSS classes

**Animation:**
- Fade in with subtle upward slide (20px)
- Duration: 400ms
- Smooth easing curve

### `PageTransition`
Handles automatic page transitions on route changes. Already integrated in the root layout.

**Features:**
- Automatically detects route changes using Next.js `usePathname()`
- Smooth fade + slide transitions between pages
- Prevents layout shifts during transitions
- SSR-safe implementation

**Note:** This component is already integrated in `app/layout.tsx`. You don't need to add it to individual pages.

## Animation Details

All animations use:
- **Duration:** 400ms (subtle and professional)
- **Easing:** Custom cubic-bezier `[0.4, 0, 0.2, 1]` for smooth transitions
- **Effect:** Fade (opacity) + Slide (y-axis, 20px)
- **Direction:** 
  - Enter: Fade in + slide up (y: 20 → 0)
  - Exit: Fade out + slide down (y: 0 → -20)

## Best Practices

1. **Use AnimatedPage** for individual page content when you want page-specific animations
2. **PageTransition** is automatic - no need to wrap individual pages
3. Both components are SSR-safe and won't break server rendering
4. Animations are subtle and professional - no flashy effects

