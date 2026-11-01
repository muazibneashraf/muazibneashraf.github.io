import type { CSSProperties } from "react";
import type { WalkthroughExample } from "@/lib/walkthrough-examples";

function Flow({ nodes }: { nodes: string[] }) {
  return <div className="walk-flow">{nodes.map((node, index) => <div className="walk-flow-item" key={node} style={{ "--item": index } as CSSProperties}>
    <span className="walk-flow-port" aria-hidden="true" /><span>{node}</span>
    {index < nodes.length - 1 && <i className="walk-flow-wire" aria-hidden="true"><b /></i>}
  </div>)}</div>;
}

function ExpressionTree() {
  const nodes = [[90, 30, "total"], [220, 30, "="], [220, 85, "+"], [140, 140, "2"], [300, 140, "×"], [265, 195, "3"], [335, 195, "4"]] as const;
  return <div className="walk-expression-tree"><svg viewBox="0 0 420 225" aria-label="Expression tree: assign two plus three times four to total">
    <g className="walk-tree-edges"><path d="M110 30H200M220 50V65M204 97L156 128M236 97L284 128M290 158L275 178M310 158L325 178" /></g>
    {nodes.map(([x, y, label], index) => <g className="walk-tree-node" key={index} style={{ "--item": index } as CSSProperties}><rect x={x - (index === 0 ? 31 : 18)} y={y - 17} width={index === 0 ? 62 : 36} height="34" rx="6" /><text x={x} y={y + 4} textAnchor="middle">{label}</text></g>)}
  </svg><span className="mono">total <b>int</b> <span>current scope</span></span></div>;
}

function Blocks({ example }: { example: WalkthroughExample }) {
  return <div className="walk-disk">
    <div className="walk-disk-label mono"><span>IMAGE LAYOUT</span><span>RESERVED / USED / FREE</span></div>
    <div className="walk-block-grid" aria-label="Schematic disk allocation">{Array.from({ length: 32 }, (_, index) => <span key={index} data-block={index < 4 ? "reserved" : index < 10 ? "used" : index < 16 && (example.phase ?? 0) > 0 ? "new" : "free"} style={{ "--item": index % 8 } as CSSProperties}>{String(index).padStart(2, "0")}</span>)}</div>
    <div className="walk-block-legend">{example.nodes?.map(node => <span key={node}>{node}</span>)}</div>
  </div>;
}

function Mask({ phase = 0 }: { phase?: number }) {
  return <div className="walk-mask-pair">{["Image", phase ? "Foreground mask" : "Binary trimap"].map((label, index) => <div className="walk-pet" key={label}>
    <svg viewBox="0 0 180 145" fill="none" aria-hidden="true">
      <path className="walk-pet-grid" d="M0 36H180M0 72H180M0 108H180M45 0V145M90 0V145M135 0V145" />
      <path className={index ? "walk-pet-mask" : "walk-pet-shape"} d="M49 54L42 16L73 35Q90 28 107 35L138 16L131 54Q146 75 132 99Q119 123 90 123Q61 123 48 99Q34 75 49 54Z" />
      {!index && <g className="walk-pet-features"><path d="M66 71H72M108 71H114M85 88L90 93L95 88M90 93V100M62 91L33 85M62 98L30 101M118 91L147 85M118 98L150 101" /></g>}
      <path className="walk-pet-scan" d="M25 72H155" />
    </svg><span className="mono">{label}</span>
  </div>)}{phase > 0 && <span className="walk-mask-class mono">+ image-level class</span>}</div>;
}

function Scene({ phase = 0 }: { phase?: number }) {
  return <div className="walk-game-scene"><svg viewBox="0 0 480 180" fill="none" aria-hidden="true">
    <path className="walk-game-grid" d="M0 155H480M40 180L180 100M130 180L210 100M240 180V100M350 180L270 100M440 180L300 100M100 135H380M150 115H330" />
    <g className="walk-game-diamond"><path d="M235 30L245 43L235 56L225 43Z" /><path d="M225 43H245M235 30V56" /></g>
    <g className="walk-game-catcher"><path d="M194 128H266L254 143H206Z" /><path d="M209 151H251" /></g>
    {phase > 0 && <path className="walk-game-trajectory" d="M235 59V118" pathLength="1" />}
  </svg><div className="walk-game-keys mono"><kbd>←</kbd><span>{phase === 0 ? "Keyboard input" : phase === 1 ? "Update + collision check" : "Redraw scene"}</span><kbd>→</kbd></div></div>;
}

export function WalkthroughPreview({ example, fallback }: { example?: WalkthroughExample; fallback?: string }) {
  return <div className="walk-preview">
    <div className="walk-preview-bar"><span className="walk-file-icon" aria-hidden="true">⌘</span><span>{example?.file ?? "Stage data"}</span><span className="mono">EXAMPLE</span></div>
    <div className={`walk-preview-content walk-preview-content--${example?.kind ?? "code"}`}>
      {example?.kind === "flow" && <Flow nodes={example.nodes ?? []} />}
      {example?.kind === "tree" && <ExpressionTree />}
      {example?.kind === "table" && <div className="walk-table-scroll"><table><thead><tr>{example.columns?.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{example.rows?.map((row, index) => <tr key={index} style={{ "--item": index } as CSSProperties}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>}
      {example?.kind === "blocks" && <Blocks example={example} />}
      {example?.kind === "mask" && <Mask phase={example.phase} />}
      {example?.kind === "scene" && <Scene phase={example.phase} />}
      {(example?.kind === "code" || !example) && <pre className="walk-code mono"><code>{(example?.lines ?? fallback?.split("\n") ?? ["Select a stage to explore its workflow."]).map((line, index) => <span className="walk-code-line" key={index} style={{ "--item": index } as CSSProperties}><i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i><span>{line || " "}</span></span>)}</code></pre>}
    </div>
    <p className="walk-preview-caption">{example?.caption ?? "An illustrative view of this stage's data."}</p>
  </div>;
}
