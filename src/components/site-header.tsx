import { Link } from "@tanstack/react-router";

const navItems = [
  { label: "Categorías", hash: "categorias" },
  { label: "Cómo funciona", hash: "como-funciona" },
  { label: "Global Chat", hash: "global-chat" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-coral text-primary-foreground shadow-coral-sm">
          <span className="font-display text-lg font-extrabold leading-none">C</span>
        </span>
        <span className="font-display text-xl font-bold tracking-tight">Connect-it</span>
      </Link>
      <nav className="hidden items-center gap-7 text-sm font-medium text-ink-soft sm:flex">
        {navItems.map((item) => (
          <Link
            key={item.hash}
            to="/"
            hash={item.hash}
            className="transition-colors hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Link
        to="/"
        hash="acceder"
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
      >
        Entrar
      </Link>
    </header>
  );
}
