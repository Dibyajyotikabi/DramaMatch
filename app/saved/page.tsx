import { SavedList } from "@/components/saved-list";
import { getCatalog } from "@/lib/providers";
import { metadata as meta } from "@/lib/seo";
export const metadata = meta(
  "Your saved dramas",
  "Your next favorites, kept close.",
  "/saved",
  true,
);
export default async function Saved() {
  return (
    <div className="page-width collection-page">
      <header className="collection-header">
        <span className="eyebrow">FOR WHEN THE MOOD STRIKES</span>
        <h1>
          Your little <em>watchlist.</em>
        </h1>
        <p>
          Good stories, saved for later. Stored on this device, just for you.
        </p>
      </header>
      <SavedList catalog={await getCatalog()} />
    </div>
  );
}
