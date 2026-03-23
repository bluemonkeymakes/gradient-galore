import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/png", href: "/favicon.png" },
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Gradient Galore" />
        <meta property="og:description" content="Create beautiful aura, mesh, marble, and classic gradients. Export production-ready CSS instantly." />
        <meta property="og:site_name" content="Gradient Galore" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Gradient Galore" />
        <meta name="twitter:description" content="Create beautiful aura, mesh, marble, and classic gradients. Export production-ready CSS instantly." />
        <meta name="theme-color" content="#09090b" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const isRouteError = isRouteErrorResponse(error);

  let title = "Something broke";
  let detail = "An unexpected error occurred.";
  let stack: string | undefined;

  if (is404) {
    title = "404";
    detail = "This page doesn't exist — but these gradients do.";
  } else if (isRouteError) {
    title = `${error.status}`;
    detail = error.statusText || detail;
  } else if (import.meta.env.DEV && error instanceof Error) {
    detail = error.message;
    stack = error.stack;
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Aura gradient background */}
      <div className="absolute inset-0 z-0" style={{ backgroundColor: "#0a0a0c" }}>
        <div
          className="absolute -inset-1/2"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 40% 50% at 25% 30%, rgba(139,92,246,0.5) 0%, rgba(139,92,246,0.1) 50%, transparent 100%)",
          }}
        />
        <div
          className="absolute -inset-1/2"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 35% 45% at 70% 20%, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0.08) 50%, transparent 100%)",
          }}
        />
        <div
          className="absolute -inset-1/2"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 30% 40% at 50% 75%, rgba(236,72,153,0.45) 0%, rgba(236,72,153,0.1) 50%, transparent 100%)",
          }}
        />
        <div
          className="absolute -inset-1/2"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 45% 35% at 80% 80%, rgba(249,115,22,0.3) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 space-y-6">
        <h1 className="text-8xl font-bold tracking-tighter text-white/90">
          {title}
        </h1>
        <p className="text-lg text-white/60 max-w-md mx-auto">
          {detail}
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <a
            href="/"
            className="px-6 py-2.5 rounded-xl bg-accent text-black text-sm font-medium hover:bg-accent-hover transition-all"
          >
            Create a Gradient
          </a>
          <a
            href="/gallery"
            className="px-6 py-2.5 rounded-xl border border-white/20 text-sm text-white/70 hover:text-white hover:border-white/40 transition-all"
          >
            Browse Gallery
          </a>
        </div>
      </div>

      {stack && (
        <pre className="relative z-10 mt-8 w-full max-w-2xl p-4 overflow-x-auto bg-black/50 rounded-xl text-xs text-white/50 border border-white/10">
          <code>{stack}</code>
        </pre>
      )}
    </div>
  );
}
