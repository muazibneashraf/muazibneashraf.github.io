"use client";
import { ResumeLink } from "@/components/ResumeOverlay";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SiteSettings } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";

function scrollToSection(hash: string) {
  const target = document.getElementById(hash.slice(1));
  if (!target) return false;
  const scrollTarget = hash === "#about" ? target : (target.querySelector(".section-heading .eyebrow, .eyebrow") ?? target);
  const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 80;
  window.scrollTo({
    top: Math.max(0, scrollTarget.getBoundingClientRect().top + window.scrollY - headerHeight - 16),
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
  return true;
}

export function SiteHeader({ site }: { site: SiteSettings }) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let frame = 0;
    let start = 64, end = 240, disposed = false;
    const updateSurface = () => {
      frame = 0;
      const progress = Math.max(0, Math.min(1, (window.scrollY - start) / (end - start)));
      const opacity = progress * progress * (3 - 2 * progress);
      header.style.setProperty("--header-surface-opacity", opacity.toFixed(4));
      header.dataset.scrolled = String(progress > 0);
    };
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      const hero = document.querySelector("section.hero");
      if (hero) {
        const heroEnd = hero.getBoundingClientRect().bottom + window.scrollY - header.offsetHeight;
        start = Math.max(120, heroEnd - window.innerHeight * 0.35);
        end = Math.max(start + 160, heroEnd);
      } else { start = 64; end = 240; }
      updateSurface();
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(updateSurface); };
    const resize = new ResizeObserver(measure);
    resize.observe(header);
    const hero = document.querySelector("section.hero");
    if (hero) resize.observe(hero);
    measure();
    document.fonts.ready.then(() => { if (!disposed) measure(); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [pathname]);

  const navigateSection = (event: { preventDefault: () => void }, hash: string) => {
    setOpen(false);
    if (hash === "#work" && pathname === "/projects") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      return;
    }
    // Keep local destinations in the current document. Let Next transition to
    // another page only when this document does not contain the destination.
    if (!document.getElementById(hash.slice(1))) return;
    event.preventDefault();
    window.history.pushState(window.history.state, "", hash);
    scrollToSection(hash);
  };
  const links = [
    { href: "/#about", section: "about", label: site.navigation.about },
    { href: "/projects", section: "work", label: site.navigation.projects },
    { href: "/#job-experience", section: "job-experience", label: site.navigation.experience },
    { href: "/#capabilities", section: "capabilities", label: site.navigation.capabilities },
  ];
  return (
    <header className="site-header" data-scrolled="false" ref={headerRef}>
      <Link
        href="/#top"
        className="wordmark"
        aria-label="Portfolio Muaz home"
        transitionTypes={["site-nav"]}
        onNavigate={(event) => {
          setOpen(false);
          if (pathname !== "/") return;
          event.preventDefault();
          window.history.replaceState(window.history.state, "", "/");
          window.scrollTo({
            top: 0,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
          });
        }}
      >
        <BrandLogo site={site} />
      </Link>
      <button
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? "Close" : "Menu"}
      </button>
      <nav
        id="primary-navigation"
        className={open ? "nav-links is-open" : "nav-links"}
        aria-label="Main navigation"
      >
        {links.map((link) => {
          const targetHref =
            pathname === "/" ? `#${link.section}` : link.href;
          return (
            <Link
              key={link.href}
              href={targetHref}
              transitionTypes={["site-nav"]}
              onNavigate={(event) => navigateSection(event, `#${link.section}`)}
              className={pathname === link.href ? "active" : ""}
            >
              {link.label}
            </Link>
          );
        })}
        <ResumeLink className="nav-resume" onClick={() => setOpen(false)}>
          {site.navigation.resume}
        </ResumeLink>
        <Link
          href="/contact"
          className="nav-contact"
          transitionTypes={["site-nav"]}
          onClick={() => setOpen(false)}
        >
          {site.navigation.contact}
        </Link>
      </nav>
    </header>
  );
}
