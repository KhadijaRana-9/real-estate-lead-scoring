export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white py-8 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="font-semibold text-gray-700 dark:text-gray-200">DreamHomes</p>
        <p className="mt-1">Find your next home, faster.</p>
        <p className="mt-4">&copy; {new Date().getFullYear()} DreamHomes. Built as a portfolio project.</p>
      </div>
    </footer>
  )
}
