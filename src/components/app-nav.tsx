import Link from "next/link";

export function AppNav() {
  return (
    <nav className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link
          href="/"
          className="font-semibold text-neutral-900 dark:text-white"
        >
          CryptoProspect
        </Link>
        <Link
          href="/"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Dashboard
        </Link>
        <Link
          href="/tracker"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Tracker
        </Link>
        <Link
          href="/analytics"
          className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          Analytics
        </Link>
      </div>
    </nav>
  );
}
