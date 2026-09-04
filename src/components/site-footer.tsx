import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-primary-foreground">
            <span className="font-display text-base font-extrabold leading-none">C</span>
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Connect-it</span>
        </Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink-soft">
          <Link to="/terminos" className="transition-colors hover:text-ink">
            Términos
          </Link>
          <Link to="/privacidad" className="transition-colors hover:text-ink">
            Privacidad
          </Link>
          <Link to="/soporte" className="transition-colors hover:text-ink">
            Soporte
          </Link>
        </nav>
        <p className="text-xs text-ink-soft">
          © {new Date().getFullYear()} Connect-it. Networking profesional.
        </p>
      </div>
    </footer>
  );
}
