import type { Drama } from "@/lib/types";
import { Icon } from "./icons";
export function DNAMeters({
  drama,
  compact = false,
}: {
  drama: Drama;
  compact?: boolean;
}) {
  return (
    <div className={`dna-meters ${compact ? "compact" : ""}`}>
      {(["romance", "chemistry", "angst"] as const).map((k) => (
        <div className="dna-meter" key={k}>
          <div>
            <span>{k}</span>
            <strong>
              {drama.dna[k]}
              <small>/10</small>
            </strong>
          </div>
          <div className="meter-track">
            <span style={{ width: `${drama.dna[k] * 10}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
export function SafeToWatch({ drama }: { drama: Drama }) {
  const n = drama.dna;
  return (
    <section className="safe-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">A LITTLE PEACE OF MIND</span>
          <h2>Safe to watch?</h2>
        </div>
        <span className="pill">
          <Icon name="flower" size={16} /> Drama DNA
        </span>
      </div>
      <p className="muted">
        Know the feeling before you press play. Ending details stay tucked away.
      </p>
      <DNAMeters drama={drama} />
      <div className="dna-facts">
        <div>
          <span>Pacing</span>
          <strong>{n.pace}</strong>
        </div>
        <div>
          <span>Love triangle</span>
          <strong>{n.loveTriangle}</strong>
        </div>
        <div>
          <span>Lead energy</span>
          <strong>{n.leadType.join(", ")}</strong>
        </div>
        <div>
          <span>Toxicity</span>
          <strong>{n.toxicity}/10</strong>
        </div>
        <div>
          <span>{drama.type === "movie" ? "Format" : "Episode count"}</span>
          <strong>
            {drama.type === "movie"
              ? "Feature film"
              : `${drama.episodeCount} episodes`}
          </strong>
        </div>
        <div>
          <span>Ending</span>
          <details className="spoiler">
            <summary>Reveal spoiler</summary>
            <strong>{n.ending}</strong>
          </details>
        </div>
      </div>
      <p className="content-note">{n.spoilerSafeNotes}</p>
      <p className="fine-print">
        Editorial tone guidance, not a content rating. Check a platform’s age
        and content advisories for personal sensitivities.
      </p>
    </section>
  );
}
