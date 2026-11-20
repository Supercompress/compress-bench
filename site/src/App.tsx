import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { reducedMotion } from "@/components/brand/brand";
import { Hero } from "@/sections/Hero";
import { Story } from "@/sections/Story";
import { Leaderboard } from "@/sections/Leaderboard";
import { Frontier } from "@/sections/Frontier";
import { Breakdown, TaskGrid } from "@/sections/Tasks";
import { Cost } from "@/sections/Cost";
import { Method, Misses, Seeds } from "@/sections/Rigor";
import { Cta, Footer, Nav, Reproduce } from "@/sections/Outro";
import { Figures } from "@/sections/Figures";
import { RealWorld } from "@/sections/RealWorld";

gsap.registerPlugin(ScrollTrigger);

const RAIL = [
  ["top", "Intro"],
  ["story", "Walkthrough"],
  ["leaderboard", "Leaderboard"],
  ["real", "Real world"],
  ["frontier", "Frontier"],
  ["tasks", "Every task"],
  ["families", "Breakdown"],
  ["cost", "Cost"],
  ["seeds", "Seeds"],
  ["method", "Method"],
  ["misses", "Misses"],
  ["figures", "Figures"],
  ["reproduce", "Reproduce"],
] as const;

function Rail() {
  const [active, setActive] = useState("top");
  useEffect(() => {
    const triggers = RAIL.map(([id]) => {
      const el = document.getElementById(id);
      return el ? ScrollTrigger.create({ trigger: el, start: "top 50%", end: "bottom 50%", onToggle: (s) => s.isActive && setActive(id) }) : null;
    });
    return () => triggers.forEach((t) => t?.kill());
  }, []);
  return (
    <nav className="rail" aria-label="Sections">
      {RAIL.map(([id, name]) => (
        <a key={id} href={`#${id}`} data-active={active === id}>
          <span>{name}</span>
          <i />
        </a>
      ))}
    </nav>
  );
}

export default function App() {
  useEffect(() => {
    if (reducedMotion()) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 3.2) });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // In-page links go through Lenis so the guided scroll eases instead of jumping.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null;
      if (!a) return;
      const el = document.querySelector(a.getAttribute("href")!);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: a.getAttribute("href") === "#story" ? 0 : -72 });
    };
    document.addEventListener("click", onClick);

    const ctx = gsap.context(() => {
      gsap.from(".reveal-hero", { y: 28, opacity: 0, duration: 1.1, ease: "power3.out", stagger: 0.12, delay: 0.1 });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, { y: 36, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
      });
    });
    const r = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(r);
    return () => {
      ctx.revert();
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <a href="#leaderboard" className="sr-only focus:not-sr-only" style={{ position: "absolute", zIndex: 99 }}>
        Skip to results
      </a>
      <Nav />
      <Rail />
      <main>
        <Hero />
        <Story />
        <Leaderboard />
        <RealWorld />
        <Frontier />
        <TaskGrid />
        <Breakdown />
        <Cost />
        <Seeds />
        <Method />
        <Misses />
        <Figures />
        <Reproduce />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
