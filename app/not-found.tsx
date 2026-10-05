import Link from "next/link";

export default function NotFound() {
  return (
    <main className="notfound">
      <h1>Lost the plot?</h1>
      <p>This page doesn&apos;t exist.</p>
      <Link href="/">Find something to watch →</Link>
    </main>
  );
}
