import type { CSSProperties, ReactNode } from "react";
import type { WalkthroughExample } from "@/lib/walkthrough-examples";
import "./walkthrough-scenes.css";

// These scenes belong to the walkthrough, independent of the project-card art.
// Each frame shows one operation; labels and motion explain its input and output.
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <g className="process-reveal" style={{ "--delay": `${delay}ms` } as CSSProperties}>{children}</g>;
}
function Label({ x, y, children, small = false }: { x: number; y: number; children: ReactNode; small?: boolean }) {
  return <text className={small ? "process-small" : "process-label"} x={x} y={y}>{children}</text>;
}
function Window({ x = 30, y = 35, w = 250, h = 210, title, children }: { x?: number; y?: number; w?: number; h?: number; title: string; children?: ReactNode }) {
  return <g className="process-window" data-width={w} data-height={h} transform={`translate(${x} ${y})`}><rect className="process-panel" width={w} height={h} rx="10" /><path className="process-rule" d={`M0 32H${w}`} /><circle className="process-dot" cx="14" cy="16" r="2" /><Label x={26} y={20} small>{title}</Label>{children}</g>;
}
function Route({ d, delay = 0 }: { d: string; delay?: number }) {
  return <g><path className="process-route" d={d} /><circle className="process-packet" r="3" style={{ offsetPath: `path('${d}')`, animationDelay: `${delay}ms` }} /></g>;
}
function Rows({ lines, x = 18, y = 60, gap = 29 }: { lines: string[]; x?: number; y?: number; gap?: number }) {
  return <>{lines.map((line, i) => <Reveal delay={i * 180} key={line}><Label x={x} y={y + i * gap}>{line}</Label></Reveal>)}</>;
}
function Arrow({ x = 300, y = 145 }: { x?: number; y?: number }) { return <path className="process-arrow" d={`M${x - 15} ${y}h30m-7-7 7 7-7 7`} />; }
function Check({ x, y }: { x: number; y: number }) { return <path className="process-check" pathLength="1" d={`m${x} ${y} 5 5 11-12`} />; }
function Pet({ mask = false, x = 0, y = 0 }: { mask?: boolean; x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`}><path className={mask ? "process-mask" : "process-pet"} d="M25 112V60L17 13L44 34Q60 25 76 34L103 13L95 60V112Q60 131 25 112Z" />{!mask && <path className="process-rule" d="M40 65h7m27 0h7M55 82l5 5 5-5M60 87v8" />}</g>;
}

function Compiler({ phase }: { phase: number }) {
  if (phase === 0) return <><Window x={70} w={460} title="example.c"><Rows lines={["int main() {", "  int total;", "  total = 2 + 3 * 4;", "  return total;", "}"]} /><path className="process-caret" d="M220 165v16" /></Window><Label x={80} y={278} small>A program enters as source text</Label></>;
  if (phase === 1) return <><Label x={35} y={45} small>READ CHARACTERS</Label><Window x={30} y={65} w={225} h={145} title="source"><Rows lines={["total = 2 + 3 * 4;"]} y={85} /></Window><Arrow x={295} /><g>{["ID", "=", "INT", "+", "INT", "*", "INT"].map((t, i) => <Reveal key={i} delay={i * 200}><rect className="process-token" x={342 + i % 3 * 73} y={75 + Math.floor(i / 3) * 54} width="62" height="36" rx="5" /><Label x={354 + i % 3 * 73} y={98 + Math.floor(i / 3) * 54}>{t}</Label></Reveal>)}</g><Label x={346} y={261} small>TOKENS → GRAMMAR</Label></>;
  if (phase === 2) return <><Label x={30} y={30} small>PRECEDENCE BECOMES STRUCTURE</Label><Route d="M280 65V115L180 180" /><Route d="M280 115L380 180V235" delay={600} />{[[280, 60, "="], [280, 115, "+"], [180, 180, "2"], [380, 180, "×"], [330, 240, "3"], [430, 240, "4"]].map(([x,y,t], i) => <Reveal key={i} delay={i*140}><circle className="process-token" cx={x} cy={y} r="22" /><Label x={Number(x)-5} y={Number(y)+5}>{t}</Label></Reveal>)}<path className="process-rule" d="M380 200L330 220M380 200L430 220" /><Label x={32} y={260} small>total : int</Label></>;
  return <><Window x={45} w={220} title="expression"><Rows lines={["2 + 3 * 4", "multiply first", "then add"]} /></Window><Arrow /><Window x={340} w={220} title="three-address code"><Rows lines={["t1 = 3 * 4", "t2 = 2 + t1", "total = t2", "return total"]} /></Window></>;
}

function FileSystem({ phase }: { phase: number }) {
  return <><Label x={30} y={30} small>{["INITIALIZE THE IMAGE", "RESERVE FREE SPACE", "COPY FILE BYTES", "LINK THE FILE INTO THE DIRECTORY"][phase]}</Label><Window x={25} y={55} w={175} h={210} title={phase < 2 ? "layout" : "notes.txt"}><Rows lines={phase === 0 ? ["Superblock", "Bitmaps", "Inode table", "Data blocks"] : phase === 1 ? ["Free inode", "Free blocks", "Mark as used"] : phase === 2 ? ["Read bytes", "Split into blocks", "Copy to image"] : ["name → inode", "inode → blocks", "CRC32 checksums"]} gap={37} /></Window><Route d="M200 150H260" /><g>{Array.from({length:32},(_,i) => <Reveal key={i} delay={phase === 0 ? i*25 : 0}><rect className={`process-block ${i<4 ? "reserved" : i<10 ? "used" : i<16 && phase>0 ? "writing" : ""}`} x={272+i%8*36} y={66+Math.floor(i/8)*43} width="27" height="30" rx="3" /><Label x={278+i%8*36} y={86+Math.floor(i/8)*43} small>{String(i).padStart(2,"0")}</Label></Reveal>)}</g><Label x={274} y={269} small>{phase === 3 ? "Directory + allocation state saved" : "ONE FILESYSTEM IMAGE / 32 ILLUSTRATIVE BLOCKS"}</Label></>;
}

function Icu({ phase }: { phase: number }) {
  if (phase === 0) return <><Window x={45} w={205} title="scanned report"><Rows lines={["ICU report", "WBC      value", "PLT      value", "Cr       value"]} /></Window><Route d="M250 145H365" /><Window x={365} y={75} w={190} h={130} title="document upload"><path className="process-arrow process-upload" d="M95 105V56m-15 15 15-15 15 15" /></Window></>;
  if (phase === 1) return <><Window x={35} w={235} title="report image"><Rows lines={["W B C    value", "P L T    value", "C r      value", "Glucose  value"]} /><path className="process-scan" d="M10 60H225" /></Window><Arrow /><Window x={340} w={225} title="recognized text"><Rows lines={["WBC: …", "Platelets: …", "Creatinine: …", "Glucose: …"]} /></Window></>;
  if (phase === 2) return <><Window x={40} w={205} title="OCR text"><Rows lines={["field / value / unit", "lab text", "unit text"]} /></Window><Route d="M245 145H330" /><Window x={330} w={235} title="structured fields"><Rows lines={["WBC         value + unit", "Platelets   value + unit", "Creatinine  value + unit", "Glucose     value + unit"]} gap={32} /></Window></>;
  if (phase === 3) return <><Label x={30} y={30} small>PROPOSED RESEARCH APPROACH</Label><Window x={25} y={80} w={145} h={130} title="structured input"><Rows lines={["lab features", "sequences"]} /></Window><Route d="M170 145H220" /><Window x={220} y={65} w={150} h={160} title="CNN"><g className="process-convolve">{Array.from({length:9},(_,i)=><rect className="process-token" key={i} x={35+i%3*25} y={52+Math.floor(i/3)*25} width="18" height="18" rx="2" />)}</g></Window><Route d="M370 145H415" delay={600} /><Window x={415} y={65} w={160} h={160} title="LSTM"><Rows lines={["t₁ → t₂ → t₃", "sequence features"]} /></Window><Label x={30} y={270} small>Academic model / no clinical prediction shown</Label></>;
  return <><Window x={90} w={420} title="processed report"><Rows lines={["Extracted fields", "Value / unit pairs", "Review the document", "Research context"]} gap={34} />{[65,99,133,167].map((y,i)=><Reveal key={y} delay={i*450}><Check x={360} y={y} /></Reveal>)}</Window><Label x={95} y={279} small>REVIEW INFORMATION WITHIN THE PROTOTYPE</Label></>;
}

function Community({ phase }: { phase: number }) {
  if (phase === 0) return <><Window x={65} w={470} title="new community post"><Rows lines={["I need help with…", "Request / offer", "Describe what is needed"]} /><rect className="process-button" x="280" y="153" width="165" height="35" rx="5" /><Label x={301} y={176}>Publish post →</Label></Window></>;
  if (phase === 1 || phase === 2) return <><path className="process-map" d="M20 85H580M20 165H580M20 245H580M95 40V270M245 40V270M410 40V270M540 40V270" />{[[95,85],[245,165],[410,85],[540,245]].map(([x,y],i)=><Reveal key={i} delay={i*220}><circle className="process-map-ring" cx={x} cy={y} r={phase===1?18:28} /><circle className="process-dot" cx={x} cy={y} r="5" /></Reveal>)}<Window x={phase===1?290:30} y={phase===1?155:30} w={230} h={112} title={phase===1?"post context":"nearby activity"}><Rows lines={phase===1?["Location attached", "Urgency visible"]:["Requests + offers", "Open a relevant post →"]} y={57} gap={28} /></Window></>;
  return <><Label x={30} y={30} small>COORDINATE THROUGH SOCKET.IO</Label><Window x={30} y={55} w={230} h={205} title="person requesting help"><Reveal><rect className="process-chat" x="15" y="55" width="195" height="44" rx="9" /><Label x={28} y={81}>Are you available?</Label></Reveal><Reveal delay={1400}><Label x={27} y={145}>Thanks. See you there.</Label></Reveal></Window><Route d="M260 140H340" /><Window x={340} y={55} w={230} h={205} title="person offering help"><Reveal delay={600}><Label x={20} y={82}>Are you available?</Label></Reveal><Reveal delay={1100}><rect className="process-chat" x="15" y="112" width="200" height="44" rx="9" /><Label x={27} y={139}>Yes, I can help.</Label></Reveal></Window></>;
}

function Churn({ phase }: { phase: number }) {
  if (phase === 0) return <><Window x={45} w={510} title="consumer data"><Rows lines={["Age     Income     Membership     Churn", "28      42,000     Regular        0", "41      missing    Premium        1", "35      58,000     Regular        0"]} gap={35} /></Window><Label x={50} y={278} small>EXAMPLE RECORDS / TARGET SEPARATE FROM FEATURES</Label></>;
  if (phase === 1) return <><Window x={25} y={70} w={155} h={150} title="mixed records"><Rows lines={["missing → filled", "text categories", "numeric values"]} /></Window><Route d="M180 145H225" /><Window x={225} y={45} w={155} h={200} title="preprocess"><Rows lines={["Impute", "Encode", "Scale"]} gap={43} /></Window><Route d="M380 145H425" delay={800} /><Window x={425} y={70} w={150} h={150} title="feature matrix">{Array.from({length:16},(_,i)=><rect key={i} className="process-feature" x={22+i%4*28} y={51+Math.floor(i/4)*21} width="18" height="12" style={{animationDelay:`${i*80}ms`}} />)}</Window></>;
  if (phase === 2) return <><Label x={25} y={30} small>ONE SPLIT / FIVE CLASSIFIERS</Label><Window x={25} y={95} w={140} h={110} title="same features"><Rows lines={["Train / test"]} /></Window>{["Logistic regression","Decision tree","Neural network","KNN","Naive Bayes"].map((m,i)=><Reveal key={m} delay={i*180}><Route d={`M165 150C240 150 230 ${50+i*48} 300 ${50+i*48}`} delay={i*240} /><rect className="process-token" x="300" y={32+i*48} width="265" height="35" rx="5" /><Label x={316} y={55+i*48}>{m}</Label></Reveal>)}</>;
  return <><Label x={30} y={30} small>UNDERSTAND THE ERRORS, THEN COMPARE</Label>{["True positive","False positive","False negative","True negative"].map((t,i)=><Reveal key={t} delay={i*230}><rect className={`process-token ${i===1||i===2?"process-error":""}`} x={35+i%2*150} y={65+Math.floor(i/2)*82} width="140" height="70" rx="7" /><Label x={48+i%2*150} y={105+Math.floor(i/2)*82}>{t}</Label></Reveal>)}<Rows x={380} y={96} lines={["Precision", "Recall", "F1 score"]} gap={48} /><Label x={35} y={267} small>SCHEMATIC CONFUSION MATRIX / NO SCORES INVENTED</Label></>;
}

function Vision({ phase }: { phase: number }) {
  if (phase === 0) return <><Window x={55} y={35} w={210} title="image"><Pet x={45} y={50} /></Window><Window x={335} y={35} w={210} title="trimap"><Pet mask x={45} y={50} /><Label x={20} y={193} small>foreground / edge / background</Label></Window></>;
  if (phase === 1) return <><Label x={25} y={30} small>ONE ENCODER LEARNS SHARED FEATURES</Label><Pet x={10} y={95} /><Route d="M130 150H180" />{[0,1,2,3].map((i)=><Reveal key={i} delay={i*250}><rect className="process-layer" x={185+i*72} y={60+i*21} width="52" height={170-i*42} rx="4" /><Label x={192+i*72} y={255} small>{["image","edges","features","latent"][i]}</Label>{i<3&&<Route d={`M${237+i*72} 145H${257+i*72}`} delay={i*300} />}</Reveal>)}<path className="process-skip" d="M210 65V40H540V125" /><Label x={370} y={34} small>U-Net skip connections</Label></>;
  if (phase === 2) return <><Window x={25} y={95} w={145} h={110} title="shared features"><Rows lines={["encoder output"]} /></Window><Route d="M170 150C260 150 230 75 330 75" /><Route d="M170 150C260 150 230 230 330 230" delay={600} /><g transform="translate(335 20) scale(.85)"><Pet mask /></g><Label x={450} y={87}>Mask decoder</Label><Window x={330} y={185} w={245} h={85} title="classification head"><Rows lines={["Image-level breed class"]} y={59} /></Window></>;
  return <><Window x={45} w={260} title="mask comparison"><Pet x={55} y={45} /><g className="process-overlay"><Pet mask x={61} y={45} /></g><Label x={20} y={194} small>reference + prediction overlay</Label></Window><Rows x={355} y={90} lines={["Mask overlap", "IoU / Dice", "Class vs label"]} gap={48} /><Label x={45} y={278} small>ILLUSTRATIVE OVERLAY / EXPERIMENTAL EVALUATION</Label></>;
}

function Graphics({ phase }: { phase: number }) {
  if (phase === 0) return <><Window x={45} y={65} w={180} h={160} title="keyboard callbacks"><rect className="process-key" x="25" y="70" width="52" height="48" rx="6" /><rect className="process-key" x="100" y="70" width="52" height="48" rx="6" /><Label x={42} y={101}>←</Label><Label x={118} y={101}>→</Label></Window><Route d="M225 145H320" /><g className="process-player-move"><path className="process-shape" d="M365 195H495L480 215H380Z" /></g><Label x={355} y={265} small>INPUT CHANGES HORIZONTAL POSITION</Label></>;
  if (phase === 1) return <><path className="process-rule" d="M40 250H330" /><g className="process-fall"><path className="process-shape" d="m180 65 14 18-14 18-14-18Z" /></g><path className="process-shape" d="M125 220H235L220 238H140Z" /><Window x={365} y={65} w={200} h={180} title="update loop"><Rows lines={["Move objects", "Check collisions", "Update score"]} gap={40} /></Window><Label x={45} y={281} small>SIMULATION BEFORE DRAWING</Label></>;
  if (phase === 2) return <><Label x={30} y={30} small>MODEL → VIEW → PROJECTION</Label><g className="process-rotate"><path className="process-shape" d="M90 80H220V210H90Z" /><path className="process-rule" d="M70 145H240M155 60V230" /></g><Arrow /><path className="process-shape" d="m395 80 115 25-24 130-115-25Z" /><path className="process-rule" d="M340 250H560M450 50V270" /><Label x={55} y={280} small>OBJECT COORDINATES</Label><Label x={365} y={280} small>SCREEN COORDINATES</Label></>;
  return <><Window x={70} w={460} title="frame buffer"><path className="process-map" d="M20 160H440M20 115H440M80 40V190M160 40V190M240 40V190M320 40V190M400 40V190" /><path className="process-render" d="m130 149 100-80 100 80-100 30Z" /><path className="process-scan" d="M15 45H445" /></Window><Label x={75} y={278} small>DRAW PRIMITIVES → DISPLAY FRAME → REPEAT</Label></>;
}

function Database({ phase }: { phase: number }) {
  if (phase === 0) return <Window x={100} w={400} title="Recipe entity"><Rows lines={["recipe_id    PRIMARY KEY", "name         dish name", "description  recipe details", "relationships → related entities"]} gap={34} /></Window>;
  if (phase === 1) return <><Window x={25} y={90} w={195} h={120} title="Recipe"><Rows lines={["recipe_id"]} /></Window>{["Ingredients","Tags","Cultural details"].map((v,i)=><Reveal key={v} delay={i*250}><Route d={`M220 150C280 150 290 ${65+i*90} 355 ${65+i*90}`} delay={i*300}/><rect className="process-token" x="355" y={43+i*90} width="210" height="45" rx="7" /><Label x={373} y={71+i*90}>{v}</Label></Reveal>)}</>;
  if (phase === 2) return <><Window x={205} y={20} w={190} h={90} title="User"><Rows lines={["user_id"]} y={60} /></Window><Route d="M300 110V155H140V190" /><Route d="M300 155H460V190" delay={500}/><Window x={45} y={190} w={190} h={85} title="Admin"><Rows lines={["role-specific links"]} y={60} /></Window><Window x={365} y={190} w={190} h={85} title="Regular user"><Rows lines={["role-specific links"]} y={60} /></Window></>;
  return <><Window x={15} y={95} w={140} h={110} title="User"><Rows lines={["user_id"]} /></Window><Route d="M155 150C200 150 200 70 225 70" /><Route d="M155 150C200 150 200 230 225 230" delay={500}/><Window x={225} y={25} w={180} h={90} title="Review"><Rows lines={["user_id + recipe_id"]} y={60} /></Window><Window x={225} y={185} w={180} h={90} title="Saved recipe"><Rows lines={["user_id + recipe_id"]} y={60} /></Window><Route d="M405 70C450 70 430 150 465 150" /><Route d="M405 230C450 230 430 150 465 150" delay={700}/><Window x={465} y={95} w={125} h={110} title="Recipe"><Rows lines={["recipe_id"]} /></Window></>;
}

function WebApp({ phase, college = false, portfolio = false }: { phase: number; college?: boolean; portfolio?: boolean }) {
  if (phase === 0) return <><Window x={60} w={480} title={college ? "college content editor" : portfolio ? "portfolio admin studio" : "admission form"}><Rows lines={college?["Public information", "Admission guidance", "Gallery content"]:portfolio?["Project title", "Page description", "Selected CV"]:["Applicant information", "Admission details", "Review before submitting"]} /><rect className="process-button" x="285" y="158" width="170" height="34" rx="5" /><Label x={303} y={180}>{college||portfolio?"Save changes →":"Submit form →"}</Label><path className="process-caret" d="M205 77v14" /></Window></>;
  if (phase === 1) return <><Window x={25} y={80} w={170} h={140} title="request"><Rows lines={[college?"Content update":portfolio?"PUT /api/content":"Form data"]} /></Window><Route d="M195 150H220" /><Window x={220} y={45} w={190} h={210} title={college?"Firebase":portfolio?"authenticated API":"Flask application"}><Rows lines={college?["Shared content", "Realtime Database", "Update listeners"]:portfolio?["Check session", "Validate content", "Accept update"]:["Handle request", "Apply workflow", "Build response"]} gap={41} /><Check x={151} y={169} /></Window><Route d="M410 150H445" delay={700}/><Window x={445} y={80} w={135} h={140} title="response"><Rows lines={[college?"New content":portfolio?"Valid update":"Result"]} /></Window></>;
  if (phase === 2 && !college) return <><Window x={35} w={235} title={portfolio?"validated content":"browser request"}><Rows lines={portfolio?["Projects", "Page text", "Resume selection"]:["Structured input", "API request", "Application logic"]} /></Window><Route d="M270 140H345" /><Window x={345} w={220} title={portfolio?"content adapter":"structured response"}><Rows lines={portfolio?["Local JSON", "or private Blob", "Shared site content"]:["Response body", "Return to browser", "Update interface"]} /></Window></>;
  if (phase === 3 && !college && !portfolio) return <><Window x={35} w={230} title="SQLAlchemy models"><Rows lines={["Model definitions", "Track schema change", "Migration revision"]} /></Window><Route d="M265 145H340" /><Window x={340} w={225} title="database schema"><Rows lines={["Tables", "Columns", "Constraints"]} gap={40}/>{[65,105,145].map((y,i)=><Reveal key={y} delay={i*450}><Check x={175} y={y}/></Reveal>)}</Window></>;
  return <><Window x={25} y={55} w={195} h={185} title={college?"shared content":"saved content"}><Rows lines={college?["বাংলা / English", "Page information", "Gallery"]:["Portfolio data", "Next.js render", "React interactions"]} /></Window><Route d="M220 145H260" /><Window x={260} y={35} w={225} h={220} title={college?"public React interface":"rendered portfolio"}><rect className="process-feature" x="18" y="50" width="189" height="45" rx="3" />{[0,1,2].map(i=><Reveal key={i} delay={i*250}><rect className="process-token" x={18+i*64} y="111" width="56" height="70" rx="4" /></Reveal>)}</Window><Window x={500} y={100} w={90} h={170} title="mobile"><Rows lines={["Content", "flows", "to fit"]} x={12} y={58} gap={25}/></Window></>;
}

const scenes: Record<string, (phase: number) => ReactNode> = {
  "compiler-toolchain": phase => <Compiler phase={phase}/>, minivsfs: phase => <FileSystem phase={phase}/>,
  "icu-analyzer": phase => <Icu phase={phase}/>, lifeline: phase => <Community phase={phase}/>,
  "customer-churn": phase => <Churn phase={phase}/>, "pet-segmentation": phase => <Vision phase={phase}/>,
  "opengl-games": phase => <Graphics phase={phase}/>, "recipe-database": phase => <Database phase={phase}/>,
  "central-public-college": phase => <WebApp phase={phase} college/>, "portfolio-platform": phase => <WebApp phase={phase} portfolio/>,
  "admission-lottery": phase => <WebApp phase={phase}/>,
};

export function WalkthroughScene({ slug, example, phase }: { slug: string; example?: WalkthroughExample; phase: number }) {
  const scene = example && scenes[slug];
  return <div className="process-scene" data-scene={`${slug}-${phase}`}>
    <svg xmlSpace="preserve" viewBox="0 0 600 300" role="img" aria-label={example ? `${example.stage}. ${example.caption}` : "Workflow illustration"}>
      {scene ? scene(phase) : <Window x={70} w={460} title="workflow"><Rows lines={example?.nodes ?? ["Follow the stage description", "Inspect its saved data"]}/></Window>}
    </svg>
    <p className="process-caption">{example?.caption ?? "Follow the stage description to explore this workflow."}</p>
  </div>;
}
