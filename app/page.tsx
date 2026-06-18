import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
          My Links Page
        </h1>
        <p className="text-white/80 text-lg mb-10">
          Create beautiful link-in-bio pages that convert your fans into subscribers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-white text-pink-600 font-semibold px-8 py-3 rounded-full hover:bg-pink-50 transition-all shadow-lg hover:shadow-xl"
          >
            Sign in
          </Link>
        </div>
      </div>

      <p className="text-white/30 text-xs mt-16">
        © 2025 My Links Page — All rights reserved
      </p>
    </div>
  )
}
