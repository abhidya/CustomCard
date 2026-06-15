import { CalendarCheck, FileText, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { legalDocumentLinks } from "../../src/legalCompliance";
import { postCustomerMutation } from "../customerShellCommands";

export type PrivacyRequestType = "export" | "delete";

const privacyRequests: Array<{ id: PrivacyRequestType; label: string; detail: string }> = [
  {
    id: "export",
    label: "Send me a copy of my data",
    detail: "Saved cards, events, and personal details connected to your account."
  },
  {
    id: "delete",
    label: "Delete my data",
    detail: "Removes saved cards, events, and personal details after a review."
  }
];

export function SettingsView({
  isSignedIn,
  userName,
  userEmail,
  getToken
}: {
  isSignedIn: boolean;
  userName: string;
  userEmail: string;
  getToken: () => Promise<string | null>;
}) {
  const [consentGranted, setConsentGranted] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<PrivacyRequestType | null>(null);
  const [requestStatus, setRequestStatus] = useState<{ tone: "ok" | "warn"; message: string } | null>(null);

  async function sendPrivacyRequest(requestType: PrivacyRequestType) {
    if (!isSignedIn || !consentGranted || pendingRequest) return;
    setPendingRequest(requestType);
    setRequestStatus(null);
    try {
      await postCustomerMutation(getToken, "/api/data-requests", {
        requestType,
        region: "us",
        consentGranted: true
      });
      setRequestStatus({
        tone: "ok",
        message:
          requestType === "delete"
            ? "Deletion request received. We review delete requests before anything is removed, and we'll follow up by email."
            : "Export request received. We'll follow up by email with a copy of your data."
      });
    } catch {
      setRequestStatus({
        tone: "warn",
        message: "We couldn't send that request right now. Please try again in a moment."
      });
    } finally {
      setPendingRequest(null);
    }
  }

  return (
    <>
      <header className="pagehead reveal">
        <h1>Settings and privacy</h1>
        <p>Your account, your connections, and your data — all in one quiet place.</p>
      </header>

      <div className="settingsLayout reveal reveal-1">
        <div className="settings">
          <section className="panelcard settingsection" aria-label="Account">
            <div className="settingsectionHead">
              <UserRound size={18} />
              <h2>Account</h2>
            </div>
            {isSignedIn ? (
              <dl className="settingfacts">
                <div>
                  <dt>Name</dt>
                  <dd>{userName || "Not set"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{userEmail || "Not set"}</dd>
                </div>
              </dl>
            ) : (
              <p>
                You're browsing without an account. You can design and print a card as a guest; sign in to generate AI
                cards, save drafts, and manage your data here.
              </p>
            )}
          </section>

          <section className="panelcard settingsection" aria-label="Connected calendars">
            <div className="settingsectionHead">
              <CalendarCheck size={18} />
              <h2>Connections</h2>
            </div>
            <p>
              Calendar connections are optional and always separate from creating an account. Google Calendar reads event
              titles and dates only, and you can start or skip it whenever you import a moment.
            </p>
            <p>
              To stop a Google Calendar connection, remove CustomCard from your Google account's security settings —
              imported event titles stay reviewable here until you delete them.
            </p>
          </section>

          <section className="panelcard settingsection" aria-label="Privacy choices">
            <div className="settingsectionHead">
              <ShieldCheck size={18} />
              <h2>Privacy choices</h2>
            </div>
            <p>
              AI helps draft your cards, and you review every word before printing. Personal details are saved only when
              you choose to save them.
            </p>
            <p>
              You pay the print shop directly. CustomCard never sees or stores your payment details.
            </p>
            <label className="settingconsent">
              <input
                aria-label="I confirm I want to send a data request for this account"
                checked={consentGranted}
                disabled={!isSignedIn}
                onChange={(event) => setConsentGranted(event.target.checked)}
                type="checkbox"
              />
              <span>I confirm I want to send a data request for this account.</span>
            </label>
            <div className="settingrequests">
              {privacyRequests.map((request) => (
                <div className="settingrequest" data-disabled={!isSignedIn || undefined} key={request.id}>
                  <div>
                    <strong>{request.label}</strong>
                    <small>{request.detail}</small>
                  </div>
                  <button
                    className="btn btn-ghost"
                    disabled={!isSignedIn || !consentGranted || pendingRequest !== null}
                    onClick={() => void sendPrivacyRequest(request.id)}
                    type="button"
                  >
                    {!isSignedIn ? "Sign in first" : pendingRequest === request.id ? "Sending..." : "Send request"}
                  </button>
                </div>
              ))}
            </div>
            {!isSignedIn ? <small className="settinghint">Sign in to send a privacy request.</small> : null}
            {requestStatus ? (
              <div className={`settingstatus settingstatus-${requestStatus.tone}`} aria-live="polite">
                {requestStatus.message}
              </div>
            ) : null}
          </section>

          <section className="panelcard settingsection" aria-label="Policies">
            <div className="settingsectionHead">
              <FileText size={18} />
              <h2>Policies</h2>
            </div>
            <nav className="settinglegal" aria-label="Policy documents">
              {legalDocumentLinks.map((link) => (
                <a href={link.path} key={link.id}>
                  {link.label}
                </a>
              ))}
            </nav>
          </section>
        </div>

        <aside className="panelcard settingsSummary" aria-label="Settings status">
          <div className="settingsectionHead">
            <LockKeyhole size={18} />
            <h2>Status</h2>
          </div>
          <ul className="settingSummaryList">
            <li>
              <span>Account</span>
              <strong>{isSignedIn ? "Signed in" : "Guest"}</strong>
            </li>
            <li>
              <span>Card drafts</span>
              <strong>{isSignedIn ? "Saved to account" : "This tab only — sign in to save"}</strong>
            </li>
            <li>
              <span>Payments</span>
              <strong>Handled by Walgreens</strong>
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}
