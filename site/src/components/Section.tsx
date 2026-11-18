import type { ReactNode } from "react";

export function Section({ id, n, kicker, title, lede, children, className = "", wide = false }: { id: string; n: string; kicker: string; title: ReactNode; lede?: ReactNode; children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <section id={id} className={`section ${className}`} data-rail={kicker}>
      <div className="wrap">
        <div className="section-head" data-reveal style={wide ? { maxWidth: "none" } : undefined}>
          <span className="num-label">
            {n} · {kicker.toUpperCase()}
          </span>
          <h2 className="h2">{title}</h2>
          {lede && <p className="lede">{lede}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
