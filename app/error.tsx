"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="notfound">
      <h1>Scene missing.</h1>
      <p>Something went wrong loading this page.</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
