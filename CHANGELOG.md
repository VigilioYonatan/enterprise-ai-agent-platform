# Changelog

All notable changes to **AgentOps** are documented in this file.

This project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.1.0-beta] - 2026-11-08

### Highlights

First public **Beta (`0.1.0-beta`)** preview of **AgentOps** — a self-hosted workspace where teams build AI assistants, connect them into visual workflows, approve sensitive actions before execution, and search private team documents on their own server.

### Added

- **Visual Workflow Builder:** Drag-and-drop and keyboard-accessible workflow studio to connect triggers, AI assistants, document search tools, and approval steps, with full revision history.
- **AI Assistants & Local Chat:** Create specialized assistants with plain-language instructions, immutable version snapshots (`v1`, `v2`), and a built-in test playground powered by local AI models (Ollama).
- **Second-Pair-of-Eyes Approvals:** Sensitive actions pause automatically and wait in the Approvals inbox so a separate workspace owner or admin can inspect and approve or reject the exact request.
- **Private Team Knowledge Base:** Upload internal playbooks and guides, control read access per teammate, and run fast semantic + keyword search with source citations.
- **Step-by-Step Run History:** Live run status and detailed step timelines showing inputs, outputs, and completion times.
- **Quality Benchmarks & Usage Tracking:** Built-in evaluation suites to test assistant accuracy before publishing, plus clear token usage summaries by local model.
- **Activity History & API Explorer:** Chronological workspace activity log and interactive browser API reference at `/reference`.
- **Adaptive Dark & Light Mode:** High-contrast dark and light themes across the entire web console and brand icons.

### Download & Install (`0.1.0-beta`)

- **Clone this release tag:**
  ```bash
  git clone --branch v0.1.0-beta <repository-url>
  cd enterprise-ai-agent-platform
  ```
- **Or download from GitHub Releases:** Download the `v0.1.0-beta` source archive (`.zip` or `.tar.gz`) from the repository **Releases** page and follow the Quick Start in [`README.md`](README.md).
