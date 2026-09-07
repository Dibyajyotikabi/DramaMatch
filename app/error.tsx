"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state page-width" role="alert">
      <h1>A brief intermission.</h1>
      <p>We couldn’t load this page. Please try again in a moment.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
