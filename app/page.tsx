export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-lg border border-aws-gray-200 bg-aws-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-medium uppercase tracking-wide text-aws-blue">
          Local-first
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-aws-gray-900 sm:text-4xl">
          Spaced Repetition
        </h1>
        <p className="mt-4 text-base leading-7 text-aws-gray-600">
          Study smarter with a local-first spaced repetition app. The project
          scaffold is ready. Start building your decks and review flow.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-orange px-6 text-sm font-semibold text-aws-squid-ink transition-colors hover:bg-aws-orange-dark"
          >
            Get started
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-md bg-aws-blue px-6 text-sm font-semibold text-aws-white transition-colors hover:bg-aws-blue-dark"
          >
            Learn more
          </button>
        </div>
      </div>
    </main>
  );
}
