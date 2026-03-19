import { NavLink } from "react-router";

const links = [
  { to: "/", label: "Gradients" },
  { to: "/palettes", label: "Palettes" },
];

export function Nav() {
  return (
    <header className="border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tight">
            Gradient <span className="text-accent">Galore</span>
          </h1>
          <nav className="flex gap-1 bg-surface-2 rounded-xl p-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-accent text-white"
                      : "text-text-dim hover:text-text"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
