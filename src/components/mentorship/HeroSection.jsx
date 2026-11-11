import { lazy, Suspense, useState, useEffect } from "react";
import icons from "./icons";
import { hero } from "./content";
import { useSmoothScroll } from "./hooks";

const HeroVisual = lazy(() => import("./HeroVisual"));

/** Renders the 3D scene only when WebGL is actually available. */
function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export default function HeroSection() {
  const scrollTo = useSmoothScroll();
  const [webgl, setWebgl] = useState(false);

  useEffect(() => setWebgl(supportsWebGL()), []);

  return (
    <section className="ms-hero" id="top">
      <div className="ms-hero__bg" aria-hidden="true">
        <img
          src={hero.images.circuit}
          alt=""
          width="1400"
          height="933"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="ms-grid-bg" aria-hidden="true" />

      <div className="ms-wrap ms-hero__inner">
        <div className="ms-hero__copy">
          <span className="ms-hero__kicker ms-reveal">
            <i aria-hidden="true" />
            {hero.kicker}
          </span>

          <h1 className="ms-reveal" data-delay="1">
            {hero.titleLead} <span className="accent">{hero.titleAccent}</span>
            <span className="thin">{hero.titleTail}</span>
          </h1>

          <p className="ms-hero__lead ms-reveal" data-delay="2">
            {hero.lead}
          </p>

          <div className="ms-hero__actions ms-reveal" data-delay="3">
            <a
              href={hero.primaryCta.href}
              className="ms-btn ms-btn--primary"
              onClick={(e) => scrollTo(e, hero.primaryCta.href)}
            >
              {hero.primaryCta.label}
              <icons.arrow size={17} />
            </a>
            <a
              href={hero.secondaryCta.href}
              className="ms-btn ms-btn--ghost"
              onClick={(e) => scrollTo(e, hero.secondaryCta.href)}
            >
              {hero.secondaryCta.label}
            </a>
          </div>

          <ul className="ms-hero__badges ms-reveal" data-delay="4">
            {hero.badges.map((b) => {
              const Icon = icons[b.icon];
              return (
                <li className="ms-badge" key={b.label}>
                  <Icon size={14} aria-hidden="true" />
                  {b.label}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="ms-hero__visual ms-reveal" data-delay="2">
          <div className="ms-hero__ring" aria-hidden="true" />
          <div className="ms-hero__ring" aria-hidden="true" />

          {/* Static poster: always painted underneath, so the hero is never empty. */}
          <div className="ms-hero__poster" aria-hidden="true">
            <img
              src={hero.images.earth}
              alt=""
              width="1400"
              height="932"
              loading="lazy"
              decoding="async"
            />
          </div>

          {webgl && (
            <Suspense fallback={null}>
              <HeroVisual />
            </Suspense>
          )}

          <div className="ms-hero__chips" aria-hidden="true">
            <span className="ms-chip ms-chip--1">
              nmap <b>-sV</b> 10.10.0.0/24
            </span>
            <span className="ms-chip ms-chip--2">
              <b>OWASP</b> Top 10
            </span>
            <span className="ms-chip ms-chip--3">
              wazuh · <b>SIEM</b>
            </span>
            <span className="ms-chip ms-chip--4">
              burpsuite <b>pro</b>
            </span>
          </div>
        </div>
      </div>

      <div className="ms-wrap" style={{ marginTop: "clamp(2.5rem,6vw,4.5rem)" }}>
        <div className="ms-divider ms-reveal">
          <span>Scroll to explore the program</span>
        </div>
      </div>
    </section>
  );
}
