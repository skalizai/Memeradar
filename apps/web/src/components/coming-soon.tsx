export function ComingSoon({ title, step }: { title: string; step: number }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted">Arrives in build step {step}.</p>
      </div>
    </main>
  );
}
