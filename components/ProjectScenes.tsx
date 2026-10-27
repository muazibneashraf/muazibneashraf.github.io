import "./project-scenes.css";

function ScenePacket({ path, delay = 0, duration = 4 }: { path: string; delay?: number; duration?: number }) {
  return <circle className="diagram-packet diagram-motion" r="2.8" fill="currentColor"
    style={{ offsetPath: `path('${path}')`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }} />;
}

export function LotteryDiagram({ labels }: { labels: string[] }) {
  return (
    <svg className="project-diagram lottery-draw" viewBox="0 0 480 200" aria-hidden="true">
      <g className="lottery-grid" fill="currentColor">
        {Array.from({ length: 17 }, (_, i) => <circle key={i} cx={12 + i * 28} cy="195" r=".7" />)}
      </g>
      <path className="lottery-connector" data-edge="entry-draw" d="M110 91H159M281 91H330" />
      <ScenePacket path="M110 91H159" delay={-1.4} duration={3.1} />
      <ScenePacket path="M281 91H330" delay={-2.4} duration={3.1} />
      <g className="lottery-entry" data-node={labels[0]}>
        <rect x="9" y="47" width="101" height="89" rx="9" />
        <text x="59.5" y="66" textAnchor="middle">{labels[0]}</text>
        {[0, 1, 2].map((i) => <g className={`lottery-applicant lottery-applicant-${i}`} key={i}>
          <rect x="22" y={78 + i * 16} width="74" height="11" rx="3" />
          <circle cx="30" cy={83.5 + i * 16} r="2.3" />
          <path d={`M39 ${83.5 + i * 16}h${35 - i * 5}`} />
        </g>)}
      </g>
      <circle className="lottery-wheel-track" cx="220" cy="91" r="60" />
      <circle className="lottery-wheel-inner" cx="220" cy="91" r="43" />
      <g className="lottery-wheel diagram-motion">
        <circle className="lottery-wheel-arc" cx="220" cy="91" r="60" />
        {[0, 1, 2, 3, 4, 5].map((i) => <g key={i} transform={`rotate(${i * 60} 220 91)`}>
          <rect className={i === 0 ? "lottery-ticket lottery-ticket-active" : "lottery-ticket"} x="208" y="23" width="24" height="16" rx="4" />
          <path className="lottery-ticket-mark" d="M214 31h12" />
        </g>)}
      </g>
      <g className="lottery-core" data-node={labels[1]}>
        <circle cx="220" cy="91" r="32" />
        <path className="lottery-shuffle" d="M207 83h6l14 16h7m-5-4 5 4-5 4M207 99h6l14-16h7m-5-4 5 4-5 4" />
        <text x="220" y="171" textAnchor="middle">{labels[1]}</text>
      </g>
      <g className="lottery-result" data-node="Selected applicant">
        <rect x="330" y="47" width="139" height="89" rx="9" />
        <text className="lottery-result-caption" x="399.5" y="67" textAnchor="middle">SELECTED</text>
        <text className="lottery-result-id lottery-result-id-primary" x="386" y="100" textAnchor="middle">#042</text>
        <text className="lottery-result-id lottery-result-id-second diagram-motion" x="386" y="100" textAnchor="middle">#128</text>
        <text className="lottery-result-id lottery-result-id-third diagram-motion" x="386" y="100" textAnchor="middle">#067</text>
        <circle className="lottery-selection-ring diagram-motion" cx="442" cy="91" r="12" />
        <path className="lottery-check" d="m435 91 5 5 9-10" />
        <path className="lottery-result-line" d="M348 116h60" />
      </g>
      <g className="lottery-service-labels">
        {labels.slice(2, 5).map((label, i) => <g key={i} data-node={label}>
          <circle cx={112 + i * 123} cy="188" r="2" />
          <text x={120 + i * 123} y="192">{label}</text>
        </g>)}
      </g>
    </svg>
  );
}

export function StudioDiagram({ labels }: { labels: string[] }) {
  return (
    <svg className="project-diagram studio-workspace" viewBox="0 0 480 200" aria-hidden="true">
      <g className="studio-editor" data-node={labels[0]}>
        <rect className="studio-window" x="9" y="20" width="218" height="145" rx="9" />
        <path className="studio-window-rule" d="M9 46h218M57 46v119" />
        <g className="studio-window-dots" fill="currentColor"><circle cx="22" cy="33" r="2" /><circle cx="30" cy="33" r="2" /><circle cx="38" cy="33" r="2" /></g>
        <text className="studio-window-title" x="134" y="37" textAnchor="middle">{labels[0]}</text>
        <rect className="studio-sidebar-selection" x="18" y="61" width="29" height="24" rx="4" />
        <path className="studio-sidebar-icon" d="M27 67h11v12H27zM27 96h11M27 104h11M27 121h11M27 129h11" />
        <text className="studio-content-label" x="73" y="72">{labels[2]}</text>
        <path className="studio-editor-rule" d="M73 85h133" />
        <g className="studio-code" fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="m80 101-5 5 5 5m7-10 5 5-5 5" />
          <path className="studio-type-line studio-type-line-1" d="M103 101h80" />
          <path className="studio-type-line studio-type-line-2" d="M103 110h55" />
          <path className="studio-type-line studio-type-line-3" d="M75 125h111" />
          <path className="studio-type-line studio-type-line-4" d="M75 134h81" />
        </g>
        <path className="studio-caret diagram-motion" d="M189 120v10" />
        <rect className="studio-save" x="174" y="145" width="38" height="10" rx="5" />
        <path className="studio-save-check" d="m183 150 3 3 6-6" />
      </g>
      <path className="studio-publish-route" data-edge="editor-preview" d="M227 102H280" />
      <ScenePacket path="M227 102H280" delay={-1.1} duration={3.2} />
      <g className="studio-publish-glyph diagram-motion">
        <path d="M247 86h13m-5-5 5 5-5 5" />
      </g>
      <g className="studio-preview" data-node={labels[4]}>
        <rect className="studio-window" x="280" y="35" width="190" height="130" rx="9" />
        <path className="studio-window-rule" d="M280 59h190" />
        <circle className="studio-live-light" cx="294" cy="47" r="2.5" />
        <text className="studio-window-title" x="377" y="51" textAnchor="middle">{labels[4]}</text>
        <g className="studio-preview-content">
          <rect className="studio-preview-art" x="294" y="72" width="50" height="50" rx="5" />
          <path className="studio-preview-symbol" d="m305 106 10-15 7 8 5-6 7 13z" />
          <path className="studio-preview-heading" d="M356 78h82M356 87h59" />
          <path className="studio-preview-copy" d="M356 102h95M356 110h82M356 118h60" />
          <rect className="studio-preview-tile" x="294" y="134" width="72" height="17" rx="3" />
          <rect className="studio-preview-tile" x="376" y="134" width="80" height="17" rx="3" />
        </g>
        <path className="studio-preview-sweep diagram-motion" d="M290 67h170v88H290z" />
      </g>
      <g className="studio-platform-labels">
        <path className="studio-lock" d="M112 182v-5a4 4 0 0 1 8 0v5m-10 0h12v8h-12z" />
        <text x="130" y="187">{labels[1]}</text>
        <circle cx="329" cy="183" r="2" />
        <text x="339" y="187">{labels[3]}</text>
      </g>
    </svg>
  );
}
