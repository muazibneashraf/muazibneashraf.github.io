import type { ReactNode } from "react";
import type { Project } from "@/lib/types";
import "./academic-projects.css";

const kinds: Record<string, string> = { "customer-churn": "churn", "compiler-toolchain": "compiler", minivsfs: "filesystem", "pet-segmentation": "vision", "opengl-games": "graphics", "recipe-database": "database", "central-public-college": "college" };

function Packet({ path, delay = 0 }: { path: string; delay?: number }) {
  return <circle className="academic-packet" r="3" style={{ offsetPath: `path('${path}')`, animationDelay: `${delay}s` }} />;
}

function Churn() {
  return <>
    <path className="churn-region" d="M95 205V30H390Z" />
    <path className="academic-grid" d="M95 30V205H390M95 155H390M95 105H390M95 55H390M155 30V205M215 30V205M275 30V205M335 30V205" />
    <path className="academic-wire churn-boundary" d="M110 190C170 175 183 114 244 112S305 48 370 40" />
    {Array.from({ length: 32 }, (_, i) => <circle key={i} className={`churn-point point-${i % 2}`} cx={112 + i * 47 % 258} cy={47 + i * 31 % 145} r={3 + i % 2} style={{ animationDelay: `${i * -.16}s` }} />)}
    <path className="churn-sweep" d="M95 30V205" /><text x="95" y="228">CONSUMER FEATURES</text><text x="432" y="48">PREDICTIONS</text>
    {[[432, 65], [480, 65], [432, 113], [480, 113]].map(([x, y], i) => <rect className={`churn-cell cell-${i}`} key={i} x={x} y={y} width="40" height="40" rx="5" />)}
    <text x="432" y="181">STAY / LEAVE</text><path className="academic-lines" d="M432 197h88" />
  </>;
}

function Compiler() {
  return <>
    <rect className="academic-panel" x="35" y="30" width="210" height="190" rx="10" /><path className="academic-wire" d="M35 56H245" /><text x="52" y="47">source.c</text>
    {[0, 1, 2, 3, 4, 5].map(i => <g key={i}><text className="compiler-gutter" x="49" y={81 + i * 22}>{i + 1}</text><path className="compiler-code" pathLength="1" d={`M75 ${78 + i * 22}h${[117, 80, 140, 98, 60, 112][i]}`} style={{ animationDelay: `${i * .4}s` }} /></g>)}
    <path className="compiler-caret" d="M200 182V196" /><path className="academic-wire" d="M260 125H300M395 63L340 115M395 63L460 115M340 115L310 165M340 115L372 165M460 115L492 165" /><Packet path="M395 63L340 115L372 165" />
    {[[395, 63, "="], [340, 115, "+"], [460, 115, "x"], [310, 165, "a"], [372, 165, "b"], [492, 165, "1"]].map(([x, y, label]) => <g key={`${x}`}><circle className="compiler-ast-node" cx={x} cy={y} r="17" /><text x={x} y={Number(y) + 4} textAnchor="middle">{label}</text></g>)}
    <text x="340" y="221">t1 = a + b</text><text x="340" y="241">x = t1</text>
  </>;
}

function FileSystem() {
  return <>
    <text x="53" y="34">INODE / BLOCK MAP</text>
    {Array.from({ length: 20 }, (_, i) => <rect key={i} className={`fs-bit ${i % 4 ? "allocated" : ""}`} x={54 + i % 5 * 33} y={57 + Math.floor(i / 5) * 34} width="24" height="24" rx="4" style={{ animationDelay: `${i * -.27}s` }} />)}
    <path className="academic-wire" d="M224 108C275 108 260 184 322 184" /><Packet path="M224 108C275 108 260 184 322 184" />
    <g className="fs-platter"><circle className="fs-disc" cx="420" cy="128" r="100" /><circle className="academic-wire" cx="420" cy="128" r="76" /><circle className="academic-wire" cx="420" cy="128" r="48" /><g className="fs-sectors">{Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI / 10; return <path key={i} d={`M${420 + Math.cos(a) * 47} ${128 + Math.sin(a) * 47}L${420 + Math.cos(a) * 91} ${128 + Math.sin(a) * 91}`} />; })}</g><path className="fs-written" d="M420 52A76 76 0 0 1 486 90" /></g>
    <circle className="academic-panel" cx="420" cy="128" r="22" /><g className="fs-head"><path d="M552 219L477 143L456 152" /><circle cx="552" cy="219" r="9" /></g><text x="351" y="250">FILESYSTEM IMAGE</text>
  </>;
}

function Cat({ x, mask = false }: { x: number; mask?: boolean }) {
  return <g transform={`translate(${x} 40)`}><rect className="vision-image" width="170" height="160" rx="10" /><path className="vision-backdrop" d="M0 119L58 67L125 113L170 72V160H0Z" /><path className={mask ? "vision-mask" : "vision-cat"} d="M45 148V92L38 32L69 57Q85 48 102 57L134 32L127 94V148Z" /><path className="vision-cat-face" d="M61 88h9m30 0h9M82 102h8m-14 15 10-5 10 5" />{mask && <><path className="vision-contour" d="M45 148V92L38 32L69 57Q85 48 102 57L134 32L127 94V148Z" pathLength="1" /><path className="vision-scan" d="M18 25H152" /></>}</g>;
}

function Vision() {
  return <><Cat x={60} /><Cat x={350} mask /><path className="academic-wire" d="M253 119H325m-8-8 8 8-8 8" /><text x="145" y="223" textAnchor="middle">INPUT IMAGE</text><text x="435" y="223" textAnchor="middle">FOREGROUND MASK</text><text x="300" y="253" textAnchor="middle">SHARED FEATURES → MASK + BREED</text></>;
}

function Graphics() {
  return <><path className="graphics-divider" d="M225 30V230" /><text x="43" y="30">CATCH THE DIAMONDS</text><g className="graphics-falling-gem"><path d="M125 55L138 73L125 91L112 73Z" /></g><g className="graphics-catcher"><path d="M73 209H177L162 229H88Z" /></g>
    <path className="academic-wire" d="M258 167L412 73L567 167L412 247ZM258 167V103L412 18L567 103V167M412 73V18M412 247V179L258 103M412 179L567 103M309 136L464 216M360 105L515 136M360 216L515 105M309 197L464 105" />
    <g className="graphics-player"><path d="M399 167L425 179L415 152Z" /></g><circle className="graphics-enemy" cx="485" cy="149" r="9" /><circle className="graphics-enemy enemy-second" cx="371" cy="111" r="8" /><Packet path="M419 169L485 149" /><text x="316" y="30">3D ARENA</text></>;
}

function Database() {
  const nodes = [[94, 55, "INGREDIENTS"], [300, 35, "CULTURE"], [504, 55, "TAGS"], [94, 205, "USERS"], [300, 230, "REVIEWS"], [504, 205, "SAVED"]] as const;
  return <>{nodes.map(([x, y, label], i) => <g key={label}><path className="database-relation" d={`M300 130Q${x} 130 ${x} ${y}`} /><circle className="database-entity-halo" cx={x} cy={y} r="23" style={{ animationDelay: `${i * -.65}s` }} /><circle className="academic-node" cx={x} cy={y} r="5" /><text x={x} y={y + (y < 130 ? -31 : 31)} textAnchor="middle">{label}</text></g>)}
    <path className="database-book" d="M253 91Q278 82 300 98Q323 82 347 91V171Q322 162 300 178Q278 162 253 171Z" /><path className="academic-wire" d="M300 98V178M264 109l23 3m-23 11 23 3m26-14 23-3m-23 17 23-3" /><text x="300" y="151" textAnchor="middle">RECIPES</text><Packet path="M300 130Q94 130 94 55" /><Packet path="M300 130Q504 130 504 205" delay={-2} /></>;
}

function College() {
  return <><rect className="academic-panel" x="95" y="26" width="360" height="203" rx="9" /><path className="academic-wire" d="M95 51H455" /><circle className="academic-node" cx="109" cy="39" r="2" /><text x="123" y="42">CENTRAL PUBLIC COLLEGE</text><rect className="college-hero" x="112" y="65" width="326" height="80" rx="5" /><path className="college-campus" d="M314 129V93H406V129M328 93V83H392V93M322 107H398M332 112V129M350 112V129M369 112V129M388 112V129M306 132H414" /><path className="college-heading" d="M128 89H253M128 104H232" /><path className="academic-lines" d="M128 119H187" />
    {[0, 1, 2].map(i => <g key={i} className="college-content" style={{ animationDelay: `${i * -.7}s` }}><rect x={112 + i * 112} y="160" width="102" height="50" rx="5" /><path d={`M${122 + i * 112} 175h77m-77 12h53`} /></g>)}
    <g className="college-mobile"><rect x="425" y="87" width="92" height="159" rx="13" /><path d="M455 97H488" /><rect className="college-hero" x="435" y="113" width="72" height="49" rx="3" /><path d="M435 175H504M435 186H490M435 197H500M435 216H504" /></g><g className="college-update"><path d="M45 218L52 176L65 196L77 167L90 218Z" /><path className="academic-wire" d="M90 198Q160 262 220 217" /><Packet path="M90 198Q160 262 220 217" /></g></>;
}

const scenes: Record<string, ReactNode> = { churn: <Churn />, compiler: <Compiler />, filesystem: <FileSystem />, vision: <Vision />, graphics: <Graphics />, database: <Database />, college: <College /> };

export function AcademicProjectVisual({ project }: { project: Project }) {
  const kind = kinds[project.id];
  if (!kind) return null;
  const category = kind === "vision" || kind === "churn" ? "research" : kind === "compiler" || kind === "filesystem" ? "backend" : "fullstack";
  return <div className={`project-visual academic-visual academic-${kind}`} data-category={category} role="img" aria-label={`${project.title}. Animated project illustration.`}>
    <div className="diagram-top mono"><span>{project.visual?.heading}</span><span>{project.category}</span></div>
    <svg className="project-diagram academic-diagram" viewBox="0 0 600 280" aria-hidden="true">{scenes[kind]}</svg>
    <div className="diagram-bottom mono"><span>{project.visual?.footer}</span><span>{project.year}</span></div>
  </div>;
}

export function hasAcademicVisual(id: string) { return id in kinds; }
