export default function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="h-48 w-full bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  )
}
