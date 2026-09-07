import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state page-width">
      <span className="eyebrow">A LITTLE PLOT TWIST · 404</span>
      <h1>This story isn’t here yet.</h1>
      <p>Our collection is still growing. Let’s find you another good story.</p>
      <Link className="button primary" href="/">
        Back to discover →
      </Link>
    </div>
  );
}
