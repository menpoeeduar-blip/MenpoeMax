/** Fondo astral animado — nebulosas, estrellas, aurora y partículas */
export function AstralBackground() {
  return (
    <div className="astral-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="astral-aurora" />
      <div className="astral-nebula astral-nebula-a" />
      <div className="astral-nebula astral-nebula-b" />
      <div className="astral-nebula astral-nebula-c" />
      <div className="astral-nebula astral-nebula-d" />
      <div className="astral-orbit astral-orbit-1" />
      <div className="astral-orbit astral-orbit-2" />
      <div className="astral-stars astral-stars-1" />
      <div className="astral-stars astral-stars-2" />
      <div className="astral-stars astral-stars-3" />
      <div className="astral-stars astral-stars-4" />
      <div className="astral-grid" />
      <div className="astral-vignette" />
    </div>
  );
}
