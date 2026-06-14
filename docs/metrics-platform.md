# Metrics platform readiness

The metrics platform is the self-hosted Prometheus + Alertmanager + Grafana
stack that covers CustomCard's **ORR (operational readiness review) dependency
metrics** and **business metrics**. It is defined as an executable contract in
`src/metricsPlatform.ts` (data in `src/metricsPlatformData.mjs`) and a deployable
stack under `infra/observability/`, and is gated in CI by
`npm run metrics:doctor`.

## What it covers

- **ORR critical dependencies** (page-worthy, `severity: critical`): Postgres,
  Redis queue, artifact object store, API ingress error budget, and the
  auth-session store. Each carries an SLO and a required alert route.
- **ORR non-critical dependencies** (`severity: warning`, degrade gracefully):
  AI text, AI image, notifications, payment sandbox, observability export, and
  CRM sync.
- **Business metrics**:
  - **SEO** — organic impressions, organic clicks, average position.
  - **Customer acquisition** — signups by channel/UTM, activation ratio,
    conversion funnel.
  - **Demographics** — region and locale/device session breakdowns, aggregated
    and PII-free (no IP, lat/long, or user identifiers as label keys).
  - **Site-usage metadata** — pageviews, active sessions, card generations, and
    page-load latency.

## Register invariants

The register fails closed. `validateMetricsPlatform()` rejects:

- metric names that are not `customcard_`-prefixed snake_case, counters that do
  not end in `_total`, and histograms that do not measure seconds;
- any label key that risks re-identifying a person (`email`, `ip_address`,
  `user_id`, `geo_lat`, …);
- ORR dependencies missing an SLO objective or an alert route;
- any item that claims live scraping (`liveScrapeEnabled`) or live external
  network calls.

`renderMetricsExpositionContract()` produces a well-formed Prometheus text
exposition for the whole catalog with placeholder `0` values. This is the
no-network proof that the catalog, the scrape config, the alert/recording rules,
and the Grafana dashboards all reference the same series names.
It is **not live telemetry ingestion**.

## Deploying the stack

See `infra/observability/README.md`. In short, bring the stack up next to the
app on the same Docker network:

```sh
docker compose \
  -f infra/docker-compose.droplet.yml \
  -f infra/observability/docker-compose.observability.yml up -d
```

Prometheus scrapes the app's `/metrics` endpoint and runs blackbox probes for
the critical and non-critical dependencies; Alertmanager routes critical alerts
to the pager receiver and warnings to the ops-chat receiver; Grafana
auto-provisions the `customcard-orr-dependencies` and
`customcard-business-metrics` dashboards from the bundled JSON.

## Remaining live evidence

Passing `npm run metrics:doctor` means the committed contract is internally
consistent. It does **not** mean a live Prometheus has scraped a real endpoint.
Each register item lists the required production evidence (live scrape sample,
Alertmanager delivery drill, Grafana panel screenshot, Search Console export)
that must be attached before the metric is treated as production-proven.

## Commands

```sh
npm run metrics:doctor
```
