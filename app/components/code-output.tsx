import { useState } from "react";
import { useAtomValue } from "jotai";
import { gradientAtom } from "~/lib/atoms";
import { generateFullCSS } from "~/lib/gradient-engine";

export function CodeOutput() {
  const state = useAtomValue(gradientAtom);
  const [copied, setCopied] = useState(false);
  const code = generateFullCSS(state);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-surface-2 border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">CSS</span>
        <button
          onClick={handleCopy}
          className="text-xs px-3 py-1 rounded-lg bg-surface-3 text-text-dim hover:text-text transition-all"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono text-text-dim overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        <code>{code}</code>
      </pre>
    </div>
  );
}
