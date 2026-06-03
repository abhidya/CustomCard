import {
  AlertTriangle,
  ArchiveRestore,
  Boxes,
  Check,
  ChevronRight,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Globe2,
  Layers3,
  Lock,
  Map,
  Printer,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  adapterBlocksRealOrders,
  agents,
  architectureProfiles,
  buildMilestones,
  computeBlueprintCoverage,
  countHardRisks,
  getBlockingGates,
  getRunMode,
  qualityGates,
  regionRequirements,
  runOperationalExtraction,
  sourceThesis,
  storyboards,
  walgreensAdapter,
  type BuildMilestone,
  type OperationalRun,
  type RunMode,
  type Storyboard
} from "./domain";
import {
  buildDemoServiceSlice,
  type ServiceSliceState
} from "./serviceKernel";

type SectionId =
  | "extract"
  | "paths"
  | "architecture"
  | "agents"
  | "runtime"
  | "adapter"
  | "regions"
  | "milestones";

const sectionNav: Array<{ id: SectionId; label: string; icon: typeof FileText }> = [
  { id: "extract", label: "Storyboard", icon: FileText },
  { id: "paths", label: "User paths", icon: Route },
  { id: "architecture", label: "Architecture", icon: Workflow },
  { id: "agents", label: "Agents", icon: Cpu },
  { id: "runtime", label: "Service slice", icon: Database },
  { id: "adapter", label: "Print adapter", icon: Printer },
  { id: "regions", label: "Risk & regions", icon: Globe2 },
  { id: "milestones", label: "Build plan", icon: ClipboardList }
];

const defaultSourceText = `A user signs up and connects email. The service detects an upcoming anniversary card for Sara and Ahmed and asks whether to generate a card. It asks questions about tone, relationship, language, and style. It remembers prior cards, such as ten years of anniversary cards, and proposes a direction for the next one. The product must support 5x7 double-sided cards with front, inside-left, inside-right, and back panels. The wedge is vendor-neutral card generation plus a physically certified WalgreensFiveBySevenDoubleSidedCardAdapter. It must quote live, never place real orders until tests and physical print validation pass, and scale from a five dollar DigitalOcean deployment to a full SaaS. It must cover regional privacy, order failures, wrong store pickup, urgent same-day recovery, and cross-platform usage.`;

const pathRows = [
  {
    id: "proactive",
    title: "Proactive invite",
    sequence: "Provider sync -> evidence -> opportunity -> interview -> print packet -> vendor handoff",
    decisions: ["enough lead time", "relationship confidence", "high-care content"],
    gates: ["user chooses generate", "panel approval", "external sharing approval"]
  },
  {
    id: "last-minute",
    title: "Last-minute card",
    sequence: "Paste details -> minimal interview -> deterministic render -> same-day adapter",
    decisions: ["pickup window safe", "asset packet valid", "vendor available"],
    gates: ["print checks", "store selection", "final handoff review"]
  },
  {
    id: "memory",
    title: "Recurring relationship",
    sequence: "Prior card history -> memory proposal -> user confirms -> new angle",
    decisions: ["memory approved", "sensitive fact detected", "avoid repetition"],
    gates: ["memory review", "claim provenance", "forget controls"]
  },
  {
    id: "high-care",
    title: "High-care event",
    sequence: "Event signal -> conservative interview -> phrase verification -> human review",
    decisions: ["religious text", "condolence context", "language risk"],
    gates: ["expanded review", "source citation", "manual approval"]
  }
];

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>("extract");
  const [runMode, setRunMode] = useState<RunMode>("five-dollar-droplet");
  const [sourceText, setSourceText] = useState(defaultSourceText);
  const [operationalRun, setOperationalRun] = useState<OperationalRun>(() =>
    runOperationalExtraction(defaultSourceText)
  );
  const [selectedStoryboardId, setSelectedStoryboardId] = useState(storyboards[0].id);
  const [selectedMilestone, setSelectedMilestone] = useState(buildMilestones[0]);

  const selectedStoryboard =
    storyboards.find((storyboard) => storyboard.id === selectedStoryboardId) ?? storyboards[0];
  const selectedProfile = getRunMode(runMode);
  const serviceSlice = useMemo(
    () => buildDemoServiceSlice(runMode === "saas-scale" ? "cloud-native-saas" : "five-dollar-droplet"),
    [runMode]
  );
  const extractionConfidence = useMemo(() => Math.min(99, 70 + sourceText.length / 55), [sourceText]);
  const blockingGates = getBlockingGates();

  return (
    <div className="blueprintShell">
      <aside className="blueprintRail" aria-label="Blueprint navigation">
        <div className="brandMark">
          <span>CC</span>
          <strong>CustomCard</strong>
          <small>Service Console</small>
        </div>
        <nav className="railList">
          {sectionNav.map((section) => {
            const Icon = section.icon;
            return (
              <button
                className={activeSection === section.id ? "railItem active" : "railItem"}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                <Icon size={17} />
                {section.label}
              </button>
            );
          })}
        </nav>
        <div className="railFooter">
          <span>Real ordering</span>
          <strong>Disabled</strong>
          <small>until physical certification</small>
        </div>
      </aside>

      <main className="blueprintMain">
        <header className="commandBar">
          <div>
            <p className="eyebrow">Production operations room</p>
            <h1>CustomCard service console</h1>
          </div>
          <div className="commandActions">
            <select
              aria-label="Deployment profile"
              onChange={(event) => setRunMode(event.target.value as RunMode)}
              value={runMode}
            >
              {architectureProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.title}
                </option>
              ))}
            </select>
            <button
              className="commandButton"
              type="button"
              onClick={() => setOperationalRun(runOperationalExtraction(sourceText))}
            >
              <Sparkles size={16} />
              Run extraction
            </button>
          </div>
        </header>

        <section className="statusStrip" aria-label="Global safety gates">
          <StatusPill icon={Lock} label="Human approval required" tone="safe" />
          <StatusPill icon={ShieldCheck} label="Vendor sharing gated" tone="safe" />
          <StatusPill icon={AlertTriangle} label={`${blockingGates.length} blocking gate`} tone="warn" />
          <StatusPill icon={Gauge} label={`${computeBlueprintCoverage()}% chapter coverage`} tone="info" />
        </section>

        <section className="thesisBand">
          <div>
            <span>Core thesis</span>
            <p>{sourceThesis}</p>
          </div>
          <div className="numericStack">
            <strong>{storyboards.length}</strong>
            <span>storyboards</span>
          </div>
          <div className="numericStack">
            <strong>{countHardRisks()}</strong>
            <span>hard-risk paths</span>
          </div>
          <div className="numericStack">
            <strong>1500x2100</strong>
            <span>print contract</span>
          </div>
        </section>

        <div className="workbenchGrid">
          <section className="canvasSurface">
            {activeSection === "extract" && (
              <StoryboardExtraction
                confidence={Math.round(extractionConfidence)}
                operationalRun={operationalRun}
                selectedStoryboard={selectedStoryboard}
                setSelectedStoryboardId={setSelectedStoryboardId}
                sourceText={sourceText}
                setSourceText={setSourceText}
              />
            )}
            {activeSection === "paths" && <UserPaths />}
            {activeSection === "architecture" && <ArchitectureMap profile={selectedProfile} />}
            {activeSection === "agents" && <AgentBoard />}
            {activeSection === "runtime" && <RuntimeSlice serviceSlice={serviceSlice} />}
            {activeSection === "adapter" && <AdapterConsole operationalRun={operationalRun} />}
            {activeSection === "regions" && <RiskRegions />}
            {activeSection === "milestones" && (
              <Milestones selected={selectedMilestone} setSelected={setSelectedMilestone} />
            )}
          </section>

          <Inspector
            activeSection={activeSection}
            operationalRun={operationalRun}
            selectedMilestone={selectedMilestone}
            selectedProfileTitle={selectedProfile.title}
            selectedStoryboard={selectedStoryboard}
            serviceSlice={serviceSlice}
          />
        </div>
      </main>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  tone
}: {
  icon: typeof Lock;
  label: string;
  tone: "safe" | "warn" | "info";
}) {
  return (
    <div className={`statusPill ${tone}`}>
      <Icon size={15} />
      {label}
    </div>
  );
}

function StoryboardExtraction({
  confidence,
  operationalRun,
  selectedStoryboard,
  setSelectedStoryboardId,
  sourceText,
  setSourceText
}: {
  confidence: number;
  operationalRun: OperationalRun;
  selectedStoryboard: Storyboard;
  setSelectedStoryboardId: (id: string) => void;
  sourceText: string;
  setSourceText: (value: string) => void;
}) {
  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">First screen</p>
          <h2>Extract storyboards from messy product context</h2>
        </div>
        <span className="confidenceBadge">{confidence}% extraction confidence</span>
      </div>

      <div className="sourceAndTimeline">
        <label className="sourcePanel">
          <span>Untrusted source paste</span>
          <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} />
        </label>
        <div className="timeline">
          {["Paste", "Detect facts", "Storyboard", "Gate risks", "Build plan"].map((item, index) => (
            <div className="timelineStep" key={item}>
              <strong>{index + 1}</strong>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="extractionFacts">
        {operationalRun.facts.map((fact) => (
          <article className="factCard" key={fact.id}>
            <span>{fact.label}</span>
            <strong>{fact.value}</strong>
            <small>{Math.round(fact.confidence * 100)}% - {fact.evidence}</small>
          </article>
        ))}
      </div>

      <div className="storyboardMatrix">
        {storyboards.map((storyboard) => (
          <button
            className={[
              "storyFrame",
              selectedStoryboard.id === storyboard.id ? "active" : "",
              operationalRun.matchedStoryboardIds.includes(storyboard.id) ? "matched" : ""
            ].join(" ")}
            key={storyboard.id}
            onClick={() => setSelectedStoryboardId(storyboard.id)}
            type="button"
          >
            <span>{storyboard.chapter.replace("-", " ")}</span>
            <strong>{storyboard.title}</strong>
            <small>{storyboard.sourceSignal}</small>
          </button>
        ))}
      </div>
    </>
  );
}

function UserPaths() {
  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Decision matrix</p>
          <h2>User paths all the way through failure and recovery</h2>
        </div>
      </div>
      <div className="pathMatrix">
        {pathRows.map((path) => (
          <article className="pathRow" key={path.id}>
            <div>
              <strong>{path.title}</strong>
              <span>{path.sequence}</span>
            </div>
            <ul>
              {path.decisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
            <div className="gateStack">
              {path.gates.map((gate) => (
                <span key={gate}>{gate}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ArchitectureMap({ profile }: { profile: ReturnType<typeof getRunMode> }) {
  const nodes = [
    ["Client", "Web, mobile shell later, shared state"],
    ["API", "Auth, projects, cards, memory, vendors"],
    ["Jobs", "sync, generation, rendering, QA"],
    ["Data", "SQL, object store, audit log"],
    ["AI", "models behind policy wrapper"],
    ["Vendors", "adapters, quotes, handoff only"]
  ];

  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Run mode: {profile.title}</p>
          <h2>Architecture that can shrink to a droplet or scale to SaaS</h2>
        </div>
      </div>
      <div className="architectureGrid">
        <div className="systemMap">
          {nodes.map(([name, detail], index) => (
            <div className="systemNode" key={name}>
              <span>0{index + 1}</span>
              <strong>{name}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
        <div className="profilePanel">
          <h3>{profile.title}</h3>
          <p>{profile.scalingMove}</p>
          <div className="chipWrap">
            {profile.stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <ul>
            {profile.tradeoffs.map((tradeoff) => (
              <li key={tradeoff}>{tradeoff}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

function AgentBoard() {
  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Agentic system</p>
          <h2>Model work is bounded; deterministic gates own production safety</h2>
        </div>
      </div>
      <div className="agentPipeline">
        {agents.map((agent, index) => (
          <article className="agentNode" key={agent.id}>
            <span>{index + 1}</span>
            <strong>{agent.name}</strong>
            <small>{agent.deterministic ? "Deterministic" : "LLM-assisted"} - {agent.hardStops[0]}</small>
            {index < agents.length - 1 && <ChevronRight size={18} />}
          </article>
        ))}
      </div>
      <div className="agentRules">
        <Rule icon={Radar} title="Prompt injection boundary" text="Provider text is data only, never instructions." />
        <Rule icon={ArchiveRestore} title="Memory provenance" text="Only approved memories enter generation." />
        <Rule icon={Database} title="Claim citations" text="Every factual claim traces to user input or memory ID." />
        <Rule icon={ShieldCheck} title="External sharing gate" text="No vendor sees data before user approval." />
      </div>
    </>
  );
}

function RuntimeSlice({ serviceSlice }: { serviceSlice: ServiceSliceState }) {
  const opportunity = serviceSlice.opportunities[0];
  const project = serviceSlice.project;
  const order = serviceSlice.order;

  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Production service kernel</p>
          <h2>Provider import, memory, lifecycle, recovery, and readiness are executable paths</h2>
        </div>
      </div>
      <div className="runtimeGrid">
        <article className="runtimePanel">
          <span>Provider import</span>
          <strong>{serviceSlice.connection.provider}</strong>
          <small>{serviceSlice.connection.scopes.join(", ")}</small>
          <small>raw content stored: {String(serviceSlice.connection.rawContentStored)}</small>
        </article>
        <article className="runtimePanel">
          <span>Opportunity</span>
          <strong>{opportunity.title}</strong>
          <small>{opportunity.leadTimeHours}h lead time - {opportunity.decision}</small>
          <small>{opportunity.evidence.join(" / ")}</small>
        </article>
        <article className="runtimePanel">
          <span>Memory store</span>
          <strong>{serviceSlice.memories.length} approved memory</strong>
          <small>{serviceSlice.memories[0]?.text}</small>
        </article>
        <article className="runtimePanel">
          <span>Renderer gate</span>
          <strong>{serviceSlice.renderPacket.kind}</strong>
          <small>
            {serviceSlice.renderPacket.assets.length} validated assets, RTL: {String(project?.requiresRtlLayout)}
          </small>
          <small>{serviceSlice.renderPacket.assets[0]?.checksum}</small>
        </article>
        <article className="runtimePanel wide">
          <span>Order recovery</span>
          <strong>{order?.status}</strong>
          <div className="chipWrap">
            {order?.recoveryActions.map((action) => (
              <span key={action}>{action}</span>
            ))}
          </div>
        </article>
        <article className="runtimePanel wide">
          <span>Runtime readiness</span>
          <div className="qualityRows compactRows">
            {serviceSlice.readiness.map((check) => (
              <div className={`qualityRow ${check.status}`} key={check.id}>
                {check.status === "pass" ? <Check size={16} /> : <AlertTriangle size={16} />}
                <strong>{check.id}</strong>
                <span>{check.detail}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
      <div className="detailBlock">
        <h3>Policy enforcement</h3>
        <div className="chipWrap">
          {serviceSlice.regulatoryDecisions.map((decision) => (
            <span key={`${decision.region}-${decision.action}`}>
              {decision.region} {decision.action}: {decision.allowed ? "allowed" : "blocked"}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function AdapterConsole({ operationalRun }: { operationalRun: OperationalRun }) {
  const adapterSafe = adapterBlocksRealOrders(walgreensAdapter);

  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{walgreensAdapter.name}</p>
          <h2>Vendor-neutral card engine, physically certified adapter</h2>
        </div>
        <span className={adapterSafe ? "safeBadge" : "dangerBadge"}>real orders disabled</span>
      </div>
      <div className="adapterLayout">
        <div className="printSpec">
          <span>Target asset</span>
          <strong>
            {walgreensAdapter.targetPixels.width} x {walgreensAdapter.targetPixels.height}
          </strong>
          <small>{walgreensAdapter.targetPixels.width / 300} x {walgreensAdapter.targetPixels.height / 300} in at 300 DPI</small>
          <div className="panelTiles">
            {walgreensAdapter.panels.map((panel) => (
              <span key={panel}>{panel}</span>
            ))}
          </div>
        </div>
        <div className="adapterChecks">
          {operationalRun.printPacket.kind === "blocked" && (
            <div className="certGate blockedPacket">
              <AlertTriangle size={16} />
              <span>{operationalRun.printPacket.reason}</span>
            </div>
          )}
          {operationalRun.printPacket.assets.map((asset) => (
            <div className="certGate pass" key={asset.panel}>
              <Check size={16} />
              <span>
                mock {asset.panel}: {asset.width} x {asset.height} @ {asset.dpi} DPI
              </span>
            </div>
          ))}
          {walgreensAdapter.certificationGates.map((gate) => (
            <div className="certGate" key={gate}>
              <AlertTriangle size={16} />
              <span>{gate}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function RiskRegions() {
  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Risk and compliance</p>
          <h2>Privacy, high-care content, and external boundaries are product surfaces</h2>
        </div>
      </div>
      <div className="regionGrid">
        {regionRequirements.map((requirement) => (
          <article className="regionPanel" key={requirement.region}>
            <strong>{requirement.region}</strong>
            <p>{requirement.dataPosture}</p>
            <div className="chipWrap">
              {requirement.requirements.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="qualityRows">
        {qualityGates.map((gate) => (
          <div className={`qualityRow ${gate.status}`} key={gate.id}>
            {gate.status === "pass" ? <Check size={16} /> : <AlertTriangle size={16} />}
            <strong>{gate.label}</strong>
            <span>{gate.detail}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Milestones({
  selected,
  setSelected
}: {
  selected: BuildMilestone;
  setSelected: (milestone: BuildMilestone) => void;
}) {
  return (
    <>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">AI coding agent runway</p>
          <h2>Concrete milestones with evidence gates</h2>
        </div>
      </div>
      <div className="milestoneBoard">
        {buildMilestones.map((milestone) => (
          <button
            className={selected.id === milestone.id ? "milestone active" : "milestone"}
            key={milestone.id}
            onClick={() => setSelected(milestone)}
            type="button"
          >
            <span>{milestone.id}</span>
            <strong>{milestone.title}</strong>
            <small>{milestone.exitGate}</small>
          </button>
        ))}
      </div>
      <div className="detailBlock">
        <h3>{selected.title}</h3>
        <div className="twoColumnList">
          <ListBlock title="Deliverables" items={selected.deliverables} />
          <ListBlock title="Evidence" items={selected.testEvidence} />
        </div>
      </div>
    </>
  );
}

function Rule({ icon: Icon, title, text }: { icon: typeof Radar; title: string; text: string }) {
  return (
    <div className="rule">
      <Icon size={18} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Inspector({
  activeSection,
  selectedMilestone,
  selectedProfileTitle,
  selectedStoryboard,
  operationalRun,
  serviceSlice
}: {
  activeSection: SectionId;
  operationalRun: OperationalRun;
  selectedMilestone: BuildMilestone;
  selectedProfileTitle: string;
  selectedStoryboard: Storyboard;
  serviceSlice: ServiceSliceState;
}) {
  return (
    <aside className="inspector">
      <div className="inspectorTitle">
        <Map size={18} />
        <strong>Inspector</strong>
        <span>{activeSection}</span>
      </div>
      <div className="inspectorBlock">
        <span>Selected storyboard</span>
        <h3>{selectedStoryboard.title}</h3>
        <p>{selectedStoryboard.userPath}</p>
      </div>
      <div className="inspectorBlock">
        <span>Evidence</span>
        <p>{selectedStoryboard.sourceSignal}</p>
      </div>
      <div className="inspectorBlock">
        <span>Failure paths</span>
        <ul>
          {selectedStoryboard.edgeCases.map((edgeCase) => (
            <li key={edgeCase}>{edgeCase}</li>
          ))}
        </ul>
      </div>
      <div className="inspectorBlock">
        <span>Deployment</span>
        <p>{selectedProfileTitle}</p>
      </div>
      <div className="inspectorBlock">
        <span>Milestone focus</span>
        <p>
          {selectedMilestone.id}: {selectedMilestone.title}
        </p>
      </div>
      <div className="inspectorBlock">
        <span>Operational run</span>
        <p>
          {operationalRun.facts.length} facts, {operationalRun.printPacket.assets.length} mock assets,
          handoff mode {operationalRun.handoff.mode}. {operationalRun.handoff.reason}
        </p>
      </div>
      <div className="inspectorBlock">
        <span>Service kernel</span>
        <p>
          {serviceSlice.connection.provider} import, {serviceSlice.memories.length} memory, order {serviceSlice.order?.status},
          config {serviceSlice.config.deploymentMode}.
        </p>
      </div>
      <div className="inspectorBlock">
        <span>Hard rule</span>
        <p>{walgreensAdapter.realOrderPolicy}</p>
      </div>
    </aside>
  );
}

export default App;
