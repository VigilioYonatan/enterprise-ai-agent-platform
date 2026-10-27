# Operations / recovery

Production infrastructure and secrets are NOT shipped. `scripts/backup-postgres.sh` creates an on-demand logical backup from a named container using an existing protected environment; PITR is **not** implemented. Prefer dedicated postgres backup roles, encrypted off-host storage, scheduled snapshots and independently verified restoration. Restore drills must run against a disposable database only.
