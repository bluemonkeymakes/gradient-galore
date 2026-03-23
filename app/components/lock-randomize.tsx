import { randomOklchHex } from "~/lib/palette";

interface ColorEntry {
  id: string;
  name: string;
  hex: string;
}

export function LockIcon({
  locked,
  onToggle,
}: {
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`shrink-0 p-1 rounded-md transition-all ${
        locked
          ? "text-accent hover:text-accent-hover"
          : "text-text-dim hover:text-text"
      }`}
      title={locked ? "Unlock color" : "Lock color"}
    >
      {locked ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 019.9-1" />
        </svg>
      )}
    </button>
  );
}

export function RandomizeButton({
  entries,
  lockedIds,
  onRandomize,
}: {
  entries: ColorEntry[];
  lockedIds: Set<string>;
  onRandomize: (updated: ColorEntry[]) => void;
}) {
  const handleRandomize = () => {
    const updated = entries.map((e) =>
      lockedIds.has(e.id) ? e : { ...e, hex: randomOklchHex() }
    );
    onRandomize(updated);
  };

  const unlockedCount = entries.filter((e) => !lockedIds.has(e.id)).length;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRandomize}
        disabled={unlockedCount === 0}
        className="flex-1 py-2 rounded-xl border border-border text-xs font-medium text-text hover:bg-surface-3 transition-all disabled:opacity-40"
      >
        Randomize {unlockedCount < entries.length ? `(${unlockedCount} unlocked)` : "All"}
      </button>
      <span className="text-xs text-text-dim">
        {entries.length - unlockedCount} locked
      </span>
    </div>
  );
}
