<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg" />
    <img alt="AgentOps Logo" src="docs/assets/logo-light.png" width="108" />
  </picture>

  <h1>AgentOps</h1>

  <p>
    <a href="#see-how-it-works">See How It Works</a> ·
    <a href="#dark--light-mode">Dark & Light Mode</a> ·
    <a href="#whats-inside">What's Inside</a> ·
    <a href="#download--get-started">Download & Get Started</a> ·
    <a href="CHANGELOG.md">Changelog (0.1.0-beta)</a>
  </p>

  <p><b>Enterprise AI agent orchestration with cryptographic human approvals, private hybrid RAG, and zero cloud data leaks.</b></p>
  <p>Automate mission-critical workflows with autonomous assistants, enforce mandatory second-pair-of-eyes approvals before sensitive tools execute, search private company playbooks with citation scoring, and maintain immutable audit traces — 100% self-hosted on your own infrastructure.</p>

  <p>
    <img src="https://img.shields.io/badge/version-0.1.0--beta-2563EB?style=flat-square" alt="Version 0.1.0-beta" />
    <img src="https://img.shields.io/badge/status-public_beta-F59E0B?style=flat-square" alt="Status Public Beta" />
    <img src="https://img.shields.io/badge/platform-Linux_|_macOS_|_Windows-18181B?style=flat-square" alt="Linux macOS Windows" />
    <img src="https://img.shields.io/badge/privacy-Self--Hosted-10B981?style=flat-square" alt="Self-Hosted" />
    <img src="https://img.shields.io/badge/theme-Dark_and_Light-6366F1?style=flat-square" alt="Dark and Light Theme" />
  </p>

  <p>
    <a href="#download--get-started"><img src="https://img.shields.io/badge/DOWNLOAD-v0.1.0--beta-09090B?style=for-the-badge&logo=github&logoColor=white" alt="Download v0.1.0-beta" /></a>
    <a href="#see-how-it-works"><img src="https://img.shields.io/badge/WATCH_QUICK_DEMOS-2563EB?style=for-the-badge&logo=youtube&logoColor=white" alt="Watch Quick Demos" /></a>
  </p>

  <p>
    <a href="#download--get-started"><b>Download AgentOps 0.1.0-beta</b></a> ·
    <a href="CHANGELOG.md">Release Notes</a> ·
    <a href="docs/GITHUB_RELEASE_0.1.0-beta.md">GitHub Release Guide</a>
  </p>

  <img src="docs/assets/screenshots/01-hero-workflow-dag.png" alt="AgentOps visual workflow builder showing the Autonomous Ticket Triage Pipeline" width="100%" />
  <p><sub>The visual workflow builder: add steps from the left panel, connect them on the canvas in the middle, and click any step (here, <b>Triage Agent</b>) to view or edit its settings on the right.</sub></p>
</div>

> [!NOTE]
> **Your data stays yours (`v0.1.0-beta`):** AgentOps runs completely on your own machine or company server. Your prompts, team documents, and approval history stay in your private workspace — with no need to send confidential work to external AI services.

---

## The Enterprise Problem We Solve

Enterprises seeking to deploy autonomous AI agents into mission-critical operations face four blocking barriers to production:

| Enterprise Roadblock | Security & Compliance Risk | How AgentOps Solves It |
| :--- | :--- | :--- |
| **1. Cloud Data Exfiltration** | Sending confidential runbooks, proprietary schemas, and customer PII to third-party multi-tenant AI clouds violates SOC 2, HIPAA, and GDPR boundaries. | **100% Sovereign & Air-Gapped Architecture:** Runs entirely within your private infrastructure. Vector embeddings, document stores, and local LLM inference (Ollama / vLLM) operate without external cloud dependencies. |
| **2. Unsupervised Destructive Actions** | Autonomous agents equipped with API credentials or database access can trigger unintended irreversible changes in production environments without oversight. | **Cryptographic Four-Eyes Approval (HITL):** Critical tool invocations automatically pause execution. A human operator must review the structured payload and cryptographically sign off before execution resumes. |
| **3. Knowledge Access Control Bypasses** | Naive RAG pipelines index documents into a shared vector store, allowing unauthorized employees or contractors to retrieve executive, legal, or HR records. | **Tenant-Scoped & Role-Based Document ACLs:** Chunks inherit strict multi-tenant boundaries and user permission levels enforced at the database layer with zero bypass risk. |
| **4. Zero Compliance Traceability** | Ephemeral chat logs provide no legal non-repudiation or forensic evidence of who authorized an action, when it ran, or what data was accessed. | **Tamper-Evident Run & Step Audit Ledger:** Every workflow step, tool call, latency metric, and approval record is persisted in an immutable audit trace ready for compliance scrutiny. |

---

## See How It Works

Short recordings captured directly from the live **AgentOps `0.1.0-beta`** app:

### 1. Open a Visual Workflow & Check Every Step of a Run

Open **Workflows** from the left menu, launch the **Autonomous Ticket Triage Pipeline** on the visual canvas, click **Triage Agent** and **Vector Search** to inspect how each step is set up, and open **Runs** to read the completed 4-step timeline from start to finish.

<div align="center">
  <img src="docs/assets/demos/01-workflow-dag-and-execution.gif" alt="Opening a visual workflow, inspecting steps, and viewing a completed run timeline" width="100%" />
  <p><sub>🎬 Auto-playing preview · <a href="docs/assets/videos/01-workflow-dag-and-execution.webm">Open full-resolution video (WebM)</a></sub></p>
</div>

### 2. Review & Approve a Sensitive Action

When a workflow reaches a sensitive step (`connector.profile.read`), it pauses and appears in **Approvals**. Open the waiting request, check the exact details it asks to access, write a brief note explaining why it is safe, confirm in the popup dialog, and see the approval logged right away in **Audit**.

<div align="center">
  <img src="docs/assets/demos/02-four-eyes-cryptographic-approval.gif" alt="Reviewing a pending request in Approvals, adding a note, confirming, and seeing it in Audit" width="100%" />
  <p><sub>🎬 Auto-playing preview · <a href="docs/assets/videos/02-four-eyes-cryptographic-approval.webm">Open full-resolution video (WebM)</a></sub></p>
</div>

### 3. Search Team Playbooks, Chat with an Assistant & Switch Themes

Open **Knowledge** to search internal runbooks (such as *PostgreSQL Failover*) and see matching passages with citations, jump to **Customer Triage Agent** to test a live question and read its reply, and click the sun/moon icon in the bottom-left corner to switch between **Dark Mode** and **Light Mode**.

<div align="center">
  <img src="docs/assets/demos/03-hybrid-rag-and-live-agent-chat.gif" alt="Searching private documents in Knowledge, chatting with an assistant, and toggling Light and Dark mode" width="100%" />
  <p><sub>🎬 Auto-playing preview · <a href="docs/assets/videos/03-hybrid-rag-and-live-agent-chat.webm">Open full-resolution video (WebM)</a></sub></p>
</div>

---

## Dark & Light Mode

Switch comfortably between Dark Mode and Light Mode at any time from the sidebar — both the workspace and the AgentOps icon adapt automatically.

| Dark Mode | Light Mode |
| :---: | :---: |
| <img src="docs/assets/screenshots/02-workspace-overview-dark.png" alt="AgentOps Workspace Overview in Dark Mode" width="100%" /> | <img src="docs/assets/screenshots/02-workspace-overview-light.png" alt="AgentOps Workspace Overview in Light Mode" width="100%" /> |
| <sub>Workspace overview (`Acme Enterprise`) in Dark Mode, showing your active organization, your role (`Owner`), and quick settings to rename or create a workspace.</sub> | <sub>The exact same workspace overview in crisp Light Mode for bright rooms and daytime work.</sub> |

---

## What's Inside

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/03-agent-playground-live-chat.png" alt="Customer Triage Agent instructions, version history, and live test chat" width="100%" />
      <p align="center"><sub><b>AI Assistants & Live Test Chat:</b> Write plain-language instructions, keep saved versions (<code>v1</code>, <code>v2</code>), and test how your assistant replies right below.</sub></p>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/04-run-step-timeline.png" alt="Completed Run da111111 showing final outcome and step-by-step timeline" width="100%" />
      <p align="center"><sub><b>Step-by-Step Run Results:</b> Open any run (<code>Run da111111</code>) to see the final resolution, total time (<code>42s</code>), and the output of every single step.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/05-four-eyes-approval.png" alt="Review approval screen showing pending request details and Approve or Reject buttons" width="100%" />
      <p align="center"><sub><b>Human Approval Inbox:</b> Review pending requests with who asked, when the request expires, the exact scope requested, and clear <b>Approve</b> / <b>Reject</b> buttons.</sub></p>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/06-hybrid-rag-knowledge.png" alt="Knowledge page showing ready documents, member access controls, and search results" width="100%" />
      <p align="center"><sub><b>Private Team Knowledge:</b> Manage who can read each playbook and search across your documents with clear excerpts and source citations.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/07-evaluations-benchmarks.png" alt="Evaluations screen showing Customer Triage Accuracy Benchmark with 2 out of 2 passed" width="100%" />
      <p align="center"><sub><b>Quality Checks:</b> Create reusable test suites (<i>Customer Triage Accuracy Benchmark</i>) and verify your assistant passes (<code>2/2</code>) before publishing changes.</sub></p>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/08-usage-finops-tokens.png" alt="Usage and tokens screen showing total calls and token counts per local model" width="100%" />
      <p align="center"><sub><b>Simple Usage Summary:</b> Track model calls and input/output volume across your local AI models at a glance — with zero per-message cloud fees.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshots/09-audit-compliance-log.png" alt="Audit page listing workspace actions, timestamps, actors, and resources" width="100%" />
      <p align="center"><sub><b>Activity History:</b> See a clean chronological log of workspace events — approvals, completed runs, indexed documents, and published workflows.</sub></p>
    </td>
    <td width="50%">
      <img src="docs/assets/screenshots/10-scalar-openapi-reference.png" alt="Interactive API Explorer in dark mode showing all available AgentOps endpoints" width="100%" />
      <p align="center"><sub><b>Built-In API Explorer:</b> Browse and try AgentOps endpoints from your browser whenever you want to connect external apps.</sub></p>
    </td>
  </tr>
</table>

---

## Download & Get Started

**Current Version:** `0.1.0-beta` ([Read the Changelog](CHANGELOG.md))

### Step 1 — Download AgentOps `0.1.0-beta`

Choose whichever way is easiest for you:

- **Option A — Download from GitHub:** Click the **Releases** section on the right side of this GitHub page and download **`AgentOps v0.1.0-beta`** (`.zip` or `.tar.gz`), or click **Code → Download ZIP**.
- **Option B — Clone with Git:**
  ```bash
  git clone --branch v0.1.0-beta <repository-url>
  cd enterprise-ai-agent-platform
  ```

### Step 2 — Start AgentOps on Your Machine

Make sure [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux) is running, then run:

```bash
cd enterprise-agents-deploy
./scripts/generate-lockfiles.sh
./scripts/local-up.sh
```

Once startup finishes, open your browser:

- **AgentOps Console:** `http://localhost:8080`
- **Local Test Mailbox (for sign-in/recovery emails):** `http://localhost:8025`

---

<details>
<summary><b>🛠️ For Developers & Contributors — Project Map, Local Dev Mode & Verification</b></summary>

<br />

### Project Map

```text
enterprise-ai-agent-platform/
├── apps/
│   ├── enterprise-agents-impl/   # Backend service, background workers, database migrations & sample seed data
│   └── enterprise-agents-web/    # Web console (visual workflow editor, assistants, approvals, knowledge, audit)
├── docs/assets/                  # Adaptive dark/light logos, Retina screenshots & recorded walkthrough videos
├── enterprise-agents-deploy/     # Ready-to-run Docker Compose setup, reverse proxy & monitoring dashboards
├── platform-ops/                 # Backup, restore & server maintenance scripts
├── prod-local/                   # Local smoke tests
├── scripts/                      # Quality checks, browser tests & automated screenshot/video recorder
├── CHANGELOG.md                  # Release history (current: 0.1.0-beta)
└── VERSION                       # Canonical version file (0.1.0-beta)
```

### Run Without Full Docker Stack (Local Node.js + PostgreSQL + Ollama)

Requires **Node.js 24** (see `apps/*/package.json#engines`), **PostgreSQL 16 with `pgvector`**, and optional **Ollama** (`nomic-embed-text` + `qwen2.5:3b`) for live local AI responses:

```bash
# 1. Install & build backend + sample workspace data
npm --prefix apps/enterprise-agents-impl install
npm --prefix apps/enterprise-agents-impl run build:contracts
npm --prefix apps/enterprise-agents-impl run build
DATABASE_URL="postgres://agentops:password@127.0.0.1:5432/agentops" npm --prefix apps/enterprise-agents-impl run db:migrate
DATABASE_URL="postgres://agentops:password@127.0.0.1:5432/agentops" npm --prefix apps/enterprise-agents-impl run db:seed

# 2. Install & build web console
npm --prefix apps/enterprise-agents-web install
npm --prefix apps/enterprise-agents-web run contracts:sync
npm --prefix apps/enterprise-agents-web run build

# 3. Run automated checks & browser tests
npm --prefix apps/enterprise-agents-impl run quality:static
npm --prefix apps/enterprise-agents-web run quality:static
node scripts/test_e2e_playwright.cjs

# 4. Refresh screenshots & short demo videos from the live app
node scripts/capture_readme_showcase.js
```

For full architecture notes, deployment gates, and security details, see [`architecture/IMPLEMENTATION_CONTRACT.md`](architecture/IMPLEMENTATION_CONTRACT.md) and [`PRODUCTION_READINESS_AUDIT.md`](PRODUCTION_READINESS_AUDIT.md).

</details>

---

## Common Questions

| Question | Answer |
| :--- | :--- |
| **Do I need an OpenAI or cloud API key?** | No. AgentOps works with local models through [Ollama](https://ollama.com) right on your own machine, so no external API key or subscription is required. |
| **Why can't I approve my own sensitive request?** | By design, sensitive steps require a *second* workspace owner or admin to review and approve them so no single person or assistant bypasses review. |
| **Can I switch between Dark Mode and Light Mode?** | Yes — click the sun/moon button in the bottom-left corner of the sidebar anytime. |
| **Is `0.1.0-beta` ready for critical production servers?** | `0.1.0-beta` is a public beta preview meant for evaluation, local workflows, and staging tests. Before running on a live production server, complete the checklist in [`PRODUCTION_READINESS_AUDIT.md`](PRODUCTION_READINESS_AUDIT.md). |
