"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { PDFDocumentLoadingTask, PDFPageProxy, RenderTask } from "pdfjs-dist";
import "./hero-resume-motion.css";

type PdfLink = {
  id: string;
  url: string;
  left: string;
  top: string;
  width: string;
  height: string;
  label: string;
};

function PdfPage({ page, width, name, total, root }: {
  page: PDFPageProxy; width: number; name: string; total: number; root: RefObject<HTMLDivElement | null>;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(page.pageNumber === 1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [links, setLinks] = useState<PdfLink[]>([]);
  const natural = page.getViewport({ scale: 1 });
  const height = width * natural.height / natural.width;

  useEffect(() => {
    if (visible || !holder.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { root: root.current, rootMargin: "700px 0px" });
    observer.observe(holder.current);
    return () => observer.disconnect();
  }, [visible, root]);

  useEffect(() => {
    if (!visible || !width || !canvas.current) return;
    let active = true;
    let task: RenderTask | undefined;
    const element = canvas.current;
    void (async () => {
      try {
        const view = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
        const ratio = Math.min(2, Math.max(1.5, window.devicePixelRatio || 1));
        // Render offscreen so resizing never blanks the visible page.
        const buffer = document.createElement("canvas");
        buffer.width = Math.ceil(view.width * ratio);
        buffer.height = Math.ceil(view.height * ratio);
        task = page.render({ canvas: buffer, viewport: view, transform: [ratio, 0, 0, ratio, 0, 0] });
        await task.promise;
        if (!active) return;
        element.width = buffer.width;
        element.height = buffer.height;
        element.getContext("2d")!.drawImage(buffer, 0, 0);
        setReady(true);
        const [content, rawAnnotations] = await Promise.all([
          page.getTextContent(),
          page.getAnnotations(),
        ]);
        if (!active) return;
        setText(content.items.flatMap(item => "str" in item ? [item.str] : []).join(" "));

        const vp = page.getViewport({ scale: 1 });
        const parsedLinks: PdfLink[] = [];
        for (const a of rawAnnotations) {
          const targetUrl = a.url || a.unsafeUrl;
          if (a.subtype === "Link" && targetUrl && /^(https?:|mailto:)/i.test(targetUrl) && Array.isArray(a.rect) && a.rect.length === 4) {
            const [x1, y1, x2, y2] = a.rect;
            const [p1x, p1y] = vp.convertToViewportPoint(x1, y1);
            const [p2x, p2y] = vp.convertToViewportPoint(x2, y2);
            const left = (Math.min(p1x, p2x) / vp.width) * 100;
            const top = (Math.min(p1y, p2y) / vp.height) * 100;
            const w = (Math.abs(p2x - p1x) / vp.width) * 100;
            const h = (Math.abs(p2y - p1y) / vp.height) * 100;
            parsedLinks.push({
              id: a.id || `${p1x.toFixed(1)}-${p1y.toFixed(1)}`,
              url: targetUrl,
              left: `${left.toFixed(3)}%`,
              top: `${top.toFixed(3)}%`,
              width: `${w.toFixed(3)}%`,
              height: `${h.toFixed(3)}%`,
              label: a.overlaidText || targetUrl,
            });
          }
        }
        setLinks(parsedLinks);
      } catch (failure) {
        if (active && !(failure instanceof Error && failure.name === "RenderingCancelledException")) setError("This page could not render. You can download the original CV instead.");
      }
    })();
    return () => { active = false; task?.cancel(); };
  }, [page, width, visible]);

  return <div className="pdf-page" ref={holder} style={{ width, height }} aria-busy={!ready && !error}>
    {error ? <p className="pdf-preview-message" role="alert">{error}</p> : <>
      {!ready && <p className="pdf-preview-message" role="status">Preparing your CV…</p>}
      <canvas ref={canvas} className="pdf-page-canvas" style={{ width, height }} role="img" aria-label={`${name} résumé, page ${page.pageNumber} of ${total}`} />
      {ready && links.length > 0 && (
        <div className="pdf-annotations-layer" aria-label="Document links">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-link-annotation"
              style={{
                left: link.left,
                top: link.top,
                width: link.width,
                height: link.height,
              }}
              title={link.url.startsWith("mailto:") ? link.url.replace(/^mailto:/, "Send email to ") : `Open ${link.url}`}
              aria-label={link.label ? `${link.label}: ${link.url}` : link.url}
              onClick={(event) => {
                event.stopPropagation();
              }}
            />
          ))}
        </div>
      )}
      <p className="sr-only">{text}</p>
    </>}
  </div>;
}

export function PdfPreview({ url, name }: { url: string; name: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const transitionFrom = useRef<DOMRect | null>(null);
  const zoomAnimation = useRef<Animation | null>(null);
  const readingAnchor = useRef<{ page: number; fraction: number; horizontal: number } | null>(null);
  const anchorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let task: PDFDocumentLoadingTask | undefined;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (!active) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        task = pdfjs.getDocument({ url, cMapUrl: "/pdfjs/cmaps/", cMapPacked: true, standardFontDataUrl: "/pdfjs/standard_fonts/", wasmUrl: "/pdfjs/wasm/" });
        const pdf = await task.promise;
        const loadedPages = await Promise.all(Array.from({length: pdf.numPages}, (_, index) => pdf.getPage(index + 1)));
        if (active) setPages(loadedPages);
      } catch {
        if (active) setError("The CV preview could not load. You can still download the original PDF.");
      }
    })();
    return () => { active = false; void task?.destroy().catch(() => {}); };
  }, [url]);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      setSize({ width: element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), height: element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const dialog = viewport.current?.closest("dialog");
    if (!dialog) return;
    dialog.dataset.reading = String(reading);
    if (pages[0]) {
      const natural = pages[0].getViewport({scale: 1});
      dialog.style.setProperty("--pdf-page-ratio", String(natural.width / natural.height));
    }
    const frame = dialog.querySelector<HTMLElement>(".cv-dialog-document");
    const before = transitionFrom.current;
    transitionFrom.current = null;
    if (frame && before) {
      zoomAnimation.current?.cancel();
      const after = frame.getBoundingClientRect();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced && document.documentElement.dataset.motionPaused !== "true" && before.width && after.width) {
        const animation = frame.animate([
          { transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})` },
          { transform: "none" },
        ], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
        animation.id = "pdf-reading-transition";
        zoomAnimation.current = animation;
      }
    }
    return () => { delete dialog.dataset.reading; };
  }, [reading, pages]);

  const natural = pages[0]?.getViewport({scale: 1});
  const width = natural && size.width > 0 && size.height > 0
    ? reading ? Math.max(size.width, Math.min(960, natural.width * 1.6)) : Math.min(size.width, size.height * natural.width / natural.height)
    : 0;
  useLayoutEffect(() => {
    const element = viewport.current, anchor = readingAnchor.current;
    if (!element || !natural || !width || !anchor) return;
    const pageHeight = width * natural.height / natural.width;
    const padding = getComputedStyle(element);
    element.scrollTop = anchor.page * (pageHeight + 16) + anchor.fraction * pageHeight + parseFloat(padding.paddingTop) - element.clientHeight * .25;
    element.scrollLeft = anchor.horizontal * width + parseFloat(padding.paddingLeft) - element.clientWidth / 2;
  }, [width, size.height, size.width, natural]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = (event: Event) => {
      const isPaused = (event as CustomEvent<{ paused?: boolean }>).detail?.paused;
      if (isPaused) zoomAnimation.current?.cancel();
    };
    const reduce = () => { if (media.matches) zoomAnimation.current?.cancel(); };
    window.addEventListener("muaz-motion-state", motion);
    media.addEventListener("change", reduce);
    return () => {
      zoomAnimation.current?.cancel();
      if (anchorTimer.current) clearTimeout(anchorTimer.current);
      window.removeEventListener("muaz-motion-state", motion);
      media.removeEventListener("change", reduce);
    };
  }, []);

  const toggleReading = () => {
    const element = viewport.current;
    const frame = element?.closest(".cv-dialog-document");
    if (frame) transitionFrom.current = frame.getBoundingClientRect();
    if (element && natural && width) {
      const padding = getComputedStyle(element), pageHeight = width * natural.height / natural.width;
      const position = Math.max(0, element.scrollTop + element.clientHeight * .25 - parseFloat(padding.paddingTop));
      const page = Math.min(pages.length - 1, Math.floor(position / (pageHeight + 16)));
      readingAnchor.current = {
        page,
        fraction: Math.min(1, (position - page * (pageHeight + 16)) / pageHeight),
        horizontal: (element.scrollLeft + element.clientWidth / 2 - parseFloat(padding.paddingLeft)) / width,
      };
      if (anchorTimer.current) clearTimeout(anchorTimer.current);
      anchorTimer.current = setTimeout(() => { readingAnchor.current = null; }, 380);
    }
    setReading(value => !value);
  };

  return <div className="pdf-preview" data-pdf-url={url} data-reading={reading}>
    <div className="pdf-preview-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Résumé document" aria-keyshortcuts="Enter" title={reading ? "Click the CV to show a full page" : "Click the CV to enlarge for reading"}
      onWheel={() => { readingAnchor.current = null; }} onTouchMove={() => { readingAnchor.current = null; }}
      onClick={event => { if (event.target instanceof HTMLCanvasElement) toggleReading(); }}
      onKeyDown={event => { if (event.key === "Enter" && event.target === event.currentTarget) { event.preventDefault(); toggleReading(); } }}>
      {error ? <p className="pdf-preview-message" role="alert">{error}</p> : width ? <div className="pdf-document-pages">
        {pages.map(page => <PdfPage key={page.pageNumber} page={page} width={width} name={name} total={pages.length} root={viewport} />)}
      </div> : <p className="pdf-preview-message" role="status">Preparing your CV…</p>}
      <span className="sr-only">The full page is shown initially. Click the CV or press Enter in this document area to enlarge it for reading. Scroll to read every page.</span>
    </div>
  </div>;
}
