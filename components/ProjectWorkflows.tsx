import "./project-workflows.css";

function FlowPacket({ path, duration = 4, delay = 0 }: { path: string; duration?: number; delay?: number }) {
  return <circle className="diagram-packet diagram-motion" r="2.6" fill="currentColor"
    style={{ offsetPath: `path('${path}')`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }} />;
}

export function IcuDiagram({ labels }: { labels: string[] }) {
  const layers = [
    [{ x: 349, y: 77 }, { x: 349, y: 99 }, { x: 349, y: 121 }],
    [{ x: 378, y: 85 }, { x: 378, y: 112 }],
    [{ x: 407, y: 77 }, { x: 407, y: 99 }, { x: 407, y: 121 }],
    [{ x: 437, y: 99 }],
  ];
  return (
    <svg className="project-diagram icu-workflow" viewBox="0 0 480 200" aria-hidden="true">
      <g className="icu-stage-guides" fill="none" stroke="currentColor">
        <path d="M9 174H466" />
        {[41, 140, 246, 397].map((x, i) => <g key={x}>
          <circle cx={x} cy="174" r="3" />
          <text x={x} y="192" textAnchor="middle">0{i + 1}</text>
        </g>)}
      </g>
      <g className="icu-connectors" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path data-edge="report-ocr" d="M74 99H101m-4-4 4 4-4 4" />
        <path data-edge="ocr-values" d="M180 99H210m-4-4 4 4-4 4" />
        <path data-edge="values-ai" d="M282 99H328m-4-4 4 4-4 4" />
      </g>
      <g className="icu-document" data-node="Lab Report">
        <path className="icu-panel" d="M17 43H57L74 60V146H9V51Q9 43 17 43Z" />
        <path d="M57 43V60H74" fill="none" stroke="currentColor" opacity=".5" />
        <text x="41" y="75" textAnchor="middle">{labels[0]}</text>
        <text x="41" y="89" textAnchor="middle">{labels[1]}</text>
        <path d="M21 104H61M21 112H53M21 120H58M21 133H61M34 127V139M21 127H61V139H21Z" fill="none" stroke="currentColor" opacity=".4" />
        <path className="icu-scan-wash diagram-motion" d="M15 62H68V77H15Z" />
        <path className="icu-scan-line diagram-motion" d="M15 77H68" stroke="currentColor" strokeWidth="1.8" />
      </g>
      <FlowPacket path="M74 99H101" duration={2.6} delay={-1.1} />
      <FlowPacket path="M180 99H210" duration={2.8} delay={-1.8} />
      <FlowPacket path="M282 99H328" duration={3.1} delay={-0.5} />
      <g className="icu-extraction" data-node="OCR Extraction">
        <rect className="icu-panel" x="101" y="64" width="79" height="70" rx="10" />
        <text className="icu-ocr-title" x="140.5" y="90" textAnchor="middle">{labels[2]}</text>
        <text x="140.5" y="109" textAnchor="middle">{labels[3]}</text>
        <text x="140.5" y="122" textAnchor="middle">{labels[4]}</text>
        {[0, 1, 2].map(i => <rect key={i} className="icu-ocr-bit" x={125 + i * 12} y="143" width="7" height="3" rx="1.5" style={{ animationDelay: `${i * .25}s` }} />)}
      </g>
      <g className="icu-values" data-node="Lab Values">
        <rect className="icu-panel" x="210" y="62" width="72" height="74" rx="8" />
        <path d="M231 62V136M210 86H282M210 111H282" fill="none" stroke="currentColor" opacity=".25" />
        {[0, 1, 2].map(i => <g key={i}>
          <path d={`M218 ${74 + i * 25}h6`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5" />
          <path className="icu-value-bar" d={`M239 ${74 + i * 25}h${[33, 23, 28][i]}`} stroke="currentColor" strokeWidth="3" strokeLinecap="round" pathLength="1" style={{ animationDelay: `${i * .45}s` }} />
        </g>)}
        <text x="246" y="153" textAnchor="middle">{labels[5]}</text>
      </g>
      <g className="icu-ai" data-node="AI Analysis">
        <rect className="icu-ai-frame" x="328" y="35" width="138" height="127" rx="14" />
        <path className="icu-chip-pins" d="M343 30V35M359 30V35M375 30V35M419 30V35M435 30V35M451 30V35M343 162V167M359 162V167M375 162V167M419 162V167M435 162V167M451 162V167M323 63H328M323 79H328M466 63H471M466 79H471M466 119H471M466 135H471M323 119H328M323 135H328" fill="none" stroke="currentColor" />
        <text className="icu-ai-title" x="397" y="55" textAnchor="middle">{labels[6] ?? "AI analysis"}</text>
        <g className="icu-neural-edges" fill="none" stroke="currentColor" strokeWidth=".8">
          {layers.slice(0, -1).flatMap((layer, i) => layer.flatMap((node, j) => layers[i + 1].map((next, k) =>
            <path key={`${i}-${j}-${k}`} className="icu-synapse" d={`M${node.x} ${node.y}L${next.x} ${next.y}`} style={{ animationDelay: `${i * .6 + j * .18 + k * .12}s` }} />
          )))}
        </g>
        <FlowPacket path="M349 77L378 112L407 99L437 99" duration={2.9} delay={-1.2} />
        {layers.flatMap((layer, i) => layer.map((node, j) => <circle key={`${i}-${j}`} className="icu-neuron" cx={node.x} cy={node.y} r={i === 3 ? 4.5 : 3.2} style={{ animationDelay: `${i * .6 + j * .2}s` }} />))}
        <text className="icu-model-label" x="397" y="149" textAnchor="middle">{labels[7] ?? "CNN + LSTM"}</text>
      </g>
    </svg>
  );
}

export function CommunityDiagram({ labels }: { labels: string[] }) {
  const route = "M100 110C146 161 190 139 231 104S327 57 376 93";
  return (
    <svg className="project-diagram community-map" viewBox="0 0 480 200" aria-hidden="true">
      <g className="community-map-streets" fill="none" stroke="currentColor">
        <path d="M20 72H155L193 34H283L321 72H462M20 158H144L183 119H297L336 158H462M54 18V64L109 119V183M425 18V65L370 120V183M184 16V64M294 143V188" />
        <path d="M24 88H64V128H24ZM133 25H164V52H133ZM320 20H349V49H320ZM410 115H453V146H410ZM198 153H220V178H198Z" />
      </g>
      <g className="community-map-neighbors" fill="none" stroke="currentColor">
        <path d="M100 110L154 76M100 110L60 150M231 104L192 156M231 104L258 48M376 93L420 141M376 93L326 145" />
        {[[154, 76], [60, 150], [192, 156], [258, 48], [420, 141], [326, 145]].map(([x, y], i) => <g key={x}>
          <circle cx={x} cy={y} r="4" />
          <circle className="community-neighbor-light" cx={x} cy={y} r="1.5" fill="currentColor" style={{ animationDelay: `${i * -.7}s` }} />
        </g>)}
      </g>
      <path className="community-map-route" data-edge="community-route" d={route} fill="none" />
      <path className="community-map-route-active diagram-motion" d={route} fill="none" pathLength="1" />
      <g className="community-map-label">
        <rect x="10" y="16" width="182" height="29" rx="7" />
        <text x="101" y="31" dominantBaseline="central" textAnchor="middle">{labels[0]}</text>
        <rect x="286" y="16" width="182" height="29" rx="7" />
        <text x="377" y="31" dominantBaseline="central" textAnchor="middle">{labels[1]}</text>
        <path d="M100 45V77M376 45V61" fill="none" />
      </g>
      <g className="community-location" data-node="Request">
        <circle className="community-location-ripple diagram-motion" cx="100" cy="110" r="17" />
        <path className="community-location-pin" d="M100 129C96 123 84 116 84 104A16 16 0 0 1 116 104C116 116 104 123 100 129Z" />
        <circle className="community-location-core" cx="100" cy="103" r="5" />
      </g>
      <g className="community-location community-location-helper" data-node="Helper">
        <circle className="community-location-ripple diagram-motion" cx="376" cy="93" r="17" style={{ animationDelay: "-1.8s" }} />
        <path className="community-location-pin" d="M376 112C372 106 360 99 360 87A16 16 0 0 1 392 87C392 99 380 106 376 112Z" />
        <path className="community-location-check" d="m370 87 4 4 8-8" />
      </g>
      <g className="community-map-match" data-node="Connection">
        <circle className="community-match-orbit" cx="231" cy="104" r="23" />
        <path className="community-locator-sweep diagram-motion" d="M208 104A23 23 0 0 1 231 81" fill="none" />
        <circle className="community-match-center" cx="231" cy="104" r="5" />
        <path className="community-match-stem" d="M231 127C231 144 240 143 240 160" fill="none" />
      </g>
      <FlowPacket path={route} duration={4.6} delay={-1.2} />
      <FlowPacket path={route} duration={4.6} delay={-3.5} />
      <g className="community-map-status">
        <rect x="167" y="162" width="146" height="27" rx="13.5" />
        <circle className="community-status-light" cx="183" cy="175.5" r="2.5" />
        <text x="247" y="176" dominantBaseline="central" textAnchor="middle">{labels[2]}</text>
      </g>
    </svg>
  );
}
