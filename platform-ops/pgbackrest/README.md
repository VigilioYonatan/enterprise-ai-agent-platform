# PostgreSQL WAL / PITR production workstream

The source includes a logical `pg_dump` backup and an isolated logical restore checker.
Neither is a WAL archive nor demonstrates point-in-time recovery. Before production, an
operator must configure **pgBackRest**, separate roles, encrypted off-host storage, WAL
archive settings, retention and scheduled restore drills. No cloud or AWS service is required.

Required release evidence: `stanza-create` and `check` output, full+incremental backup,
WAL segment archival continuity, restore to a chosen timestamp on an isolated host,
measured RPO/RTO, disaster runbook and verification of application-level consistency.

Do not run unreviewed `restore` commands against a production data directory.
