import { Suspense } from "react";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <section className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 shadow rounded-lg p-6">
        <Suspense fallback={<div>Chargement...</div>}>{children}</Suspense>
      </div>
    </section>
  );
}
