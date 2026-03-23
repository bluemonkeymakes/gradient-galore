import { useState } from "react";
import { useLoaderData, useNavigate, Link } from "react-router";
import { useSetAtom } from "jotai";
import { gradientAtom } from "~/lib/atoms";
import { db } from "~/db";
import { gradients } from "~/db/schema";
import { eq } from "drizzle-orm";
import { generateCSS, exportGradient, GRADIENT_EXPORT_FORMATS, type GradientState, type GradientExportFormat } from "~/lib/gradient-engine";
import { GradientThumbnail } from "~/components/gradient-thumbnail";
import type { Route } from "./+types/gallery.$id";

export async function loader({ params }: Route.LoaderArgs) {
  const id = Number(params.id);
  if (isNaN(id)) throw new Response("Not found", { status: 404 });

  const rows = await db.select().from(gradients).where(eq(gradients.id, id));
  if (rows.length === 0) throw new Response("Not found", { status: 404 });

  return { gradient: rows[0] };
}

export function meta({ data }: Route.MetaArgs) {
  const name = data?.gradient?.name ?? "Gradient";
  return [
    { title: `${name} — Gradient Galore` },
  ];
}

export default function GradientDetail() {
  const { gradient } = useLoaderData<typeof loader>();
  const setGradient = useSetAtom(gradientAtom);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<GradientExportFormat>("css");
  const [showCode, setShowCode] = useState(false);

  const state: GradientState | null = (() => {
    try { return JSON.parse(gradient.state); } catch { return null; }
  })();

  const tags = gradient.tags.split(",").map((t: string) => t.trim()).filter(Boolean);
  const exportCode = state ? exportGradient(state, exportFormat) : gradient.previewCss;

  const handleEdit = () => {
    if (state) {
      setGradient(state);
      navigate("/");
    }
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(exportCode); } catch { return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/gallery" className="text-sm text-text-dim hover:text-text transition-all flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Gallery
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }}
            className="px-4 py-2 rounded-xl bg-surface-2 border border-border text-sm text-text-dim hover:text-text transition-all"
          >
            {linkCopied ? "Link Copied!" : "Share"}
          </button>
          <button
            onClick={() => setShowCode(!showCode)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              showCode
                ? "bg-surface-3 border border-border text-text"
                : "bg-surface-2 border border-border text-text-dim hover:text-text"
            }`}
          >
            {showCode ? "Hide Code" : "Export Code"}
          </button>
          {state && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all"
            >
              Edit Gradient
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen preview */}
      {state ? (
        <GradientThumbnail state={state} className="flex-1" />
      ) : (
        <div className="flex-1 relative" style={{ background: gradient.previewCss }} />
      )}

      {/* Export panel */}
      {showCode && (
        <div className="px-6 py-4 border-t border-border bg-surface-2">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {GRADIENT_EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setExportFormat(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      exportFormat === f.value
                        ? "bg-accent text-black"
                        : "bg-surface-3 text-text-dim hover:text-text"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface-3 text-text-dim hover:text-text transition-all"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="bg-surface p-4 rounded-xl text-sm font-mono text-text-dim overflow-x-auto leading-relaxed whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
              <code>{exportCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Info bar */}
      <div className="px-6 py-5 border-t border-border bg-surface-2">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">{gradient.name}</h1>
            <div className="flex items-center gap-3 text-xs text-text-dim">
              <span className="bg-surface-3 px-2 py-0.5 rounded-md capitalize">{gradient.type}</span>
              <span>{new Date(gradient.createdAt).toLocaleDateString()}</span>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/gallery?tag=${encodeURIComponent(tag)}`}
                    className="text-xs bg-surface-3 text-text-dim px-2 py-0.5 rounded-md hover:text-text transition-all"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
