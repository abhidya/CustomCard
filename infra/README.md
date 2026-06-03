# CustomCard Infrastructure

This directory is the deployable service skeleton for the production path.

- `docker-compose.dev.yml` runs app, worker, Postgres, Redis, and MinIO for local development.
- `docker-compose.droplet.yml` is the cheap single-host deployment shape for a small DigitalOcean droplet.
- `k8s/app.yaml` is the cloud-native starting point for web and worker deployments.
- `migrations/001_initial_schema.sql` defines the durable service data model.
- `env/.env.example` lists required secrets and kill switches.

For the droplet deployment, provide `POSTGRES_PASSWORD` from a real secret source
or local deployment `.env` that is never committed. The compose file uses
`${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}` so the service fails closed instead
of starting with an empty database password.

For Kubernetes, apply the `customcard-migrate` Job successfully before rolling
the web and worker Deployments. The deployment manifest keeps the live-order kill
switch explicit and uses probes so bad pods fail visibly.

The Kubernetes `Secret` in `k8s/app.yaml` is intentionally empty and annotated as
pre-created by a secret manager. Production clusters should source the required
keys from the platform secret manager, External Secrets, Sealed Secrets, or an
equivalent operator-approved mechanism. The `runtime:doctor` check rejects empty
values, known placeholders, and any live-order kill switch value other than
`disabled`.

Real external ordering stays disabled with `REAL_ORDER_KILL_SWITCH=disabled` until vendor sandbox tests and physical print certification are recorded.
