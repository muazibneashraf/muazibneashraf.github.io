"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { Project } from "@/lib/types";
import "./project-chooser.css";

function ProjectIcon({ category }: { category: string }) {
  const path = /AI/.test(category) ? "M4 7h4m8 0h4M4 17h4m8 0h4M8 7l8 10M8 17l8-10M8 7v10m8-10v10" : /Systems/.test(category) ? "m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14" : /Database/.test(category) ? "M4 6c0-4 16-4 16 0v12c0 4-16 4-16 0ZM4 6c0 4 16 4 16 0M4 12c0 4 16 4 16 0" : /Graphics/.test(category) ? "m12 2 9 5v10l-9 5-9-5V7Zm0 10v10M3 7l9 5 9-5" : "M3 5h18v14H3ZM3 9h18m-14-2h1m2 0h1";
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={path}/></svg>;
}

export function ProjectChooser({ projects, selectedIndex, onSelect }: { projects: Project[]; selectedIndex: number; onSelect: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const currentId = useId();
  const filtered = projects.map((project, index) => ({ project, index })).filter(({ project }) => `${project.title} ${project.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!open) return;
    search.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  function openMenu() { setQuery(""); setHighlighted(-1); setOpen(true); }
  function keyboard(event: KeyboardEvent) {
    if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(); return; }
    const inSearch = event.target === search.current;
    let next: number | undefined;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { openMenu(); return; }
      if (!filtered.length) return;
      next = inSearch ? (event.key === "ArrowDown" ? 0 : filtered.length - 1) : (highlighted + (event.key === "ArrowDown" ? 1 : -1) + filtered.length) % filtered.length;
    }
    if (open && !inSearch && (event.key === "Home" || event.key === "End")) { event.preventDefault(); next = event.key === "Home" ? 0 : filtered.length - 1; }
    if (next !== undefined) { setHighlighted(next); options.current[next]?.focus({ preventScroll: true }); const option = options.current[next];
      const list = option?.parentElement;
      if (option && list) {
        if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
        else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
      } }
  }
  const project = projects[selectedIndex];
  if (!project) return null;
  return <div ref={root} className="trace-project-picker" onKeyDown={keyboard} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span className="mono">PROJECT</span>
    <div className="trace-chooser-anchor">
      <button ref={trigger} className="trace-chooser-trigger" type="button" aria-label="Choose a project" aria-describedby={currentId} aria-haspopup="dialog" aria-controls={menuId} aria-expanded={open} onClick={() => open ? close() : openMenu()}>
        <span className="trace-chooser-emblem"><ProjectIcon category={project.category}/></span>
        <span id={currentId} className="trace-chooser-current" key={project.id}>{project.title}</span>
        <span className="trace-switch-hint">Switch</span>
        <svg className="trace-chooser-chevron" data-open={open} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m5 6 3-3 3 3M5 10l3 3 3-3"/></svg>
      </button>
      {open && <button className="trace-menu-backdrop" type="button" tabIndex={-1} aria-label="Close project menu" onClick={close}/>}
      <div id={menuId} className="trace-project-menu" data-open={open} aria-hidden={!open} inert={!open} role="dialog" aria-label="Switch project">
        <div className="trace-menu-heading"><span>Find a workflow</span><span className="mono">{projects.length} projects</span><button className="trace-menu-close" type="button" aria-label="Close project chooser" onClick={close}>×</button></div>
        <div className="trace-project-search"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5"/><path d="m12 12 5 5"/></svg><input ref={search} type="search" aria-label="Search projects" placeholder="Search projects…" value={query} onChange={event => { setQuery(event.target.value); setHighlighted(-1); }}/><kbd>ESC</kbd></div>
        <div className="trace-menu-options" role="listbox" aria-label="Projects">
          {filtered.map(({ project: item, index }, position) => <button ref={element => { options.current[position] = element; }} role="option" aria-selected={selectedIndex === index} tabIndex={open && highlighted === position ? 0 : -1} type="button" key={item.id} onFocus={() => setHighlighted(position)} onClick={() => { onSelect(index); close(); }}>
            <span className="trace-option-icon"><ProjectIcon category={item.category}/></span>
            <span className="trace-option-copy"><strong>{item.title}</strong><small>{item.category}</small></span>
            <span className="trace-option-count mono">{String(item.walkthroughSteps?.length ?? 0).padStart(2,"0")} steps</span>
            <span className="trace-option-check" aria-hidden="true">{selectedIndex === index ? "✓" : "→"}</span>
          </button>)}
          {!filtered.length && <p className="trace-no-results" role="status">No projects match “{query}”.</p>}
        </div>
        <div className="trace-menu-foot"><span>Choose a project to follow its process</span><span aria-hidden="true">↑ ↓ to browse</span></div>
      </div>
    </div>
  </div>;
}
