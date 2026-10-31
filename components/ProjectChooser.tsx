"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { Project } from "@/lib/types";
import "./project-chooser.css";

export function ProjectChooser({ projects, selectedIndex, onSelect }: { projects: Project[]; selectedIndex: number; onSelect: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(selectedIndex);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const currentId = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const option = options.current[highlighted], container = list.current;
    option?.focus({ preventScroll: true });
    if (!option || !container) return;
    if (option.offsetTop < container.scrollTop) container.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = option.offsetTop + option.offsetHeight - container.clientHeight;
  }, [open, highlighted]);
  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  function keyboard(event: KeyboardEvent) {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted(open ? (highlighted + (event.key === "ArrowDown" ? 1 : -1) + projects.length) % projects.length : selectedIndex);
      setOpen(true);
    }
    if (open && (event.key === "Home" || event.key === "End")) { event.preventDefault(); setHighlighted(event.key === "Home" ? 0 : projects.length - 1); }
  }
  const project = projects[selectedIndex];
  if (!project) return null;
  return <div ref={root} className="trace-project-picker" onKeyDown={keyboard} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="mono">PROJECT</span>
    <div className="trace-chooser-anchor">
      <button ref={trigger} className="trace-chooser-trigger" type="button" aria-label="Choose a project" aria-describedby={currentId} aria-haspopup="listbox" aria-controls={menuId} aria-expanded={open} onClick={() => { setHighlighted(selectedIndex); setOpen(value => !value); }}>
        <svg className="trace-chooser-emblem" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6H19M5 12H14M5 18H19M17 10L20 12L17 14" /><circle cx="3" cy="6" r="1" /><circle cx="3" cy="12" r="1" /><circle cx="3" cy="18" r="1" /></svg>
        <span id={currentId} className="trace-chooser-current" key={project.id}>{project.title}</span>
        <svg className="trace-chooser-chevron" data-open={open} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6L8 10L12 6" /></svg>
      </button>
      <div id={menuId} className="trace-project-menu" data-open={open} aria-hidden={!open} inert={!open}>
        <div className="trace-menu-heading"><span>Choose a project</span><span className="mono">{projects.length} projects</span></div>
        <div ref={list} className="trace-menu-options" role="listbox" aria-label="Projects">
          {projects.map((item, index) => <button ref={element => { options.current[index] = element; }} role="option" aria-selected={selectedIndex === index} tabIndex={open && highlighted === index ? 0 : -1} type="button" key={item.id} style={{ "--option-order": Math.min(index, 8) } as CSSProperties} onFocus={() => setHighlighted(index)} onClick={() => { onSelect(index); close(); }}>
            <span className="trace-option-number mono" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <span><strong>{item.title}</strong><small>{item.category}<span aria-hidden="true"> · </span>{item.walkthroughSteps?.length ?? 0} stages</small></span>
            <span className="trace-option-check" aria-hidden="true">{selectedIndex === index ? "✓" : "↗"}</span>
          </button>)}
        </div>
      </div>
    </div>
  </div>;
}
