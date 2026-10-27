"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { siteThemeStyle } from "@/lib/theme";
import type { SiteContent } from "@/lib/types";
import "./hero-resume-motion.css";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const ResumeContext = createContext<(() => void) | null>(null);
const PdfPreview = dynamic(() => import("./PdfPreview").then(module => module.PdfPreview), { ssr: false, loading: () => <p className="pdf-preview-message" role="status">Loading résumé…</p> });

export function ResumeLink({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const open = useContext(ResumeContext);
  return (
    <Link
      href="/resume"
      className={className}
      onClick={(event) => {
        if (
          !open ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        onClick?.();
        open();
      }}
    >
      {children}
    </Link>
  );
}

export function ResumeOverlay({
  children,
  url,
  name,
  theme,
  initiallyOpen = false,
}: {
  children: ReactNode;
  url: string;
  name: string;
  theme: SiteContent["theme"];
  initiallyOpen?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(initiallyOpen);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <ResumeContext.Provider
      value={() => {
        setOpen(true);
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className="cv-dialog"
        style={siteThemeStyle(theme)}
        aria-label={`${name} — CV`}
        onCancel={() => setOpen(false)}
        onClose={() => {
          // Strict Mode replays the showModal effect. Ignore a queued close
          // event from its cleanup if the next effect already reopened it.
          if (!dialog.current?.open) setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="cv-dialog-actions" role="group" aria-label="Résumé controls">
          <a className="button secondary" href={url} download="Muaz_Ibne_Ashraf_CV.pdf">
            Download CV
          </a>
          <button
            type="button"
            className="cv-close"
            aria-label="Close résumé"
            onClick={() => setOpen(false)}
            autoFocus
          >
            ×
          </button>
        </div>
        <div className="cv-dialog-document">
          {open && <PdfPreview key={url} url={url} name={name} />}
        </div>
      </dialog>
    </ResumeContext.Provider>
  );
}
