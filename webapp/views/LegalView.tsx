import { CheckCircle2, ExternalLink, FileText, Globe2, Scale, ShieldCheck } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  buildLegalPolicyLinks,
  freeLegalToolOptions,
  type LegalComplianceItem,
  type LegalComplianceRegion,
  type LegalComplianceSummary
} from "../../src/legalCompliance";

interface ConsentPreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string | null;
}

const defaultConsentPreferences: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: null
};

export function LegalView({
  items,
  summary
}: {
  items: LegalComplianceItem[];
  summary: LegalComplianceSummary;
}) {
  const policyLinks = useMemo(() => buildLegalPolicyLinks(import.meta.env as Record<string, unknown>), []);
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultConsentPreferences);
  const euItems = items.filter((item) => item.region === "eu");
  const usItems = items.filter((item) => item.region === "us");
  const configuredPolicyCount = policyLinks.filter((link) => link.configured).length;

  function togglePreference(key: "analytics" | "marketing") {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
      updatedAt: new Date().toISOString()
    }));
  }

  return (
    <section className="legalView reveal">
      <header className="pagehead legalHead">
        <p className="eyebrow">Legal readiness</p>
        <h1>EU and US requirements</h1>
        <p>
          Free generators and consent tools are linked here; CustomCard still keeps public compliance claims blocked
          until the generated policies, consent setup, and review evidence are attached.
        </p>
      </header>

      <section className="legalSummaryGrid" aria-label="Legal readiness summary">
        <LegalMetric label="EU items" value={`${summary.euRequirements}`} />
        <LegalMetric label="US items" value={`${summary.usRequirements}`} />
        <LegalMetric label="Free tools" value={`${summary.freeToolOptions}`} />
        <LegalMetric label="Policies linked" value={`${configuredPolicyCount}/${policyLinks.length}`} />
      </section>

      <section className="legalPanel legalPolicyPanel" aria-label="Policy links">
        <div className="legalPanelHeader">
          <span className="legalIcon">
            <FileText size={18} />
          </span>
          <div>
            <h2>Policy links</h2>
            <p>Use the env URLs after a free generator produces drafts; fallbacks open the free tool path.</p>
          </div>
        </div>
        <div className="legalLinkGrid">
          {policyLinks.map((link) => (
            <a className="legalLinkCard" href={link.url} key={link.id} rel="noreferrer" target="_blank">
              <span>{link.label}</span>
              <strong>{link.configured ? "Configured" : link.fallbackLabel}</strong>
              <small>{link.configured ? link.envVar : `Set ${link.envVar}`}</small>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
      </section>

      <section className="legalPanel legalConsentPanel" aria-label="Consent preferences">
        <div className="legalPanelHeader">
          <span className="legalIcon">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h2>Consent categories</h2>
            <p>No optional trackers are loaded by this repo; these preferences prepare the free CMP categories.</p>
          </div>
        </div>
        <div className="consentRows">
          <ConsentRow
            checked
            description="Required for sign-in, security, and the local card workflow."
            disabled
            label="Necessary"
          />
          <ConsentRow
            checked={preferences.analytics}
            description="Only enable after a free CMP blocks analytics until consent."
            label="Analytics"
            onToggle={() => togglePreference("analytics")}
          />
          <ConsentRow
            checked={preferences.marketing}
            description="Only enable after opt-in, unsubscribe, and suppression evidence exists."
            label="Marketing"
            onToggle={() => togglePreference("marketing")}
          />
        </div>
      </section>

      <section className="legalRegionGrid" aria-label="EU and US requirement matrix">
        <RegionRequirements icon={<Globe2 size={18} />} items={euItems} region="eu" title="EU / UK" />
        <RegionRequirements icon={<Scale size={18} />} items={usItems} region="us" title="United States" />
      </section>

      <section className="legalPanel" aria-label="Free legal tools">
        <div className="legalPanelHeader">
          <span className="legalIcon">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <h2>Free tool options</h2>
            <p>Use only free, free-tier, or open-source options in this stage.</p>
          </div>
        </div>
        <div className="freeToolGrid">
          {freeLegalToolOptions.map((tool) => (
            <a className="freeToolCard" href={tool.url} key={tool.id} rel="noreferrer" target="_blank">
              <span>{tool.cost}</span>
              <strong>{tool.label}</strong>
              <small>{tool.covers.slice(0, 3).join(", ")}</small>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}

function RegionRequirements({
  icon,
  items,
  region,
  title
}: {
  icon: ReactNode;
  items: LegalComplianceItem[];
  region: LegalComplianceRegion;
  title: string;
}) {
  return (
    <article className="legalPanel">
      <div className="legalPanelHeader">
        <span className="legalIcon">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{items.length} requirements tracked with free-tool paths.</p>
        </div>
      </div>
      <div className="requirementList">
        {items.map((item) => (
          <div className={`requirementCard requirement-${region}`} key={item.id}>
            <span>{item.category}</span>
            <strong>{item.label}</strong>
            <small>{item.blocker}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function ConsentRow({
  checked,
  description,
  disabled = false,
  label,
  onToggle
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onToggle?: () => void;
}) {
  return (
    <label className="consentRow">
      <input checked={checked} disabled={disabled} onChange={onToggle} type="checkbox" />
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </label>
  );
}

function LegalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="legalMetric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
