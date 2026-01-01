export default function ProductLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-600" />
        <p className="text-sm text-neutral-600">Loading product...</p>
      </div>
    </div>
  )
}

