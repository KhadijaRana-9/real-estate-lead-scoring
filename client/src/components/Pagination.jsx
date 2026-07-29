// Builds a windowed page list: first, last, current +/- 1, and '...'
// gaps in between - never renders more than ~7 buttons regardless of
// how many pages exist (this dataset alone is 250+ pages at 12/page;
// rendering one button per page was the previous, unusable approach).
function buildPageWindow(page, totalPages) {
  const window = new Set([1, totalPages, page, page - 1, page + 1])
  const pages = [...window].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b)

  const withGaps = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) withGaps.push('gap')
    withGaps.push(p)
  })
  return withGaps
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const items = buildPageWindow(page, totalPages)

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
      >
        Prev
      </button>

      {items.map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-gray-400 select-none">
            &hellip;
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            className={`min-w-9 rounded-lg px-3 py-1.5 text-sm ${
              item === page
                ? 'bg-brand-600 text-white'
                : 'border border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700"
      >
        Next
      </button>
    </div>
  )
}
