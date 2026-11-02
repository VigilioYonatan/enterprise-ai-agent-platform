const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { chromium } = require(
  path.resolve(
    __dirname,
    '../apps/enterprise-agents-web/node_modules/@playwright/test',
  ),
);

const FRONTEND_BASE_URL =
  process.env.SHOWCASE_WEB_URL || 'http://localhost:8080';
const BACKEND_REFERENCE_URL =
  process.env.SHOWCASE_DOCS_URL || 'http://localhost:3000/reference';

const SEEDED_ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const SEEDED_WORKFLOW_ID = 'b1111111-1111-4111-8111-111111111111';
const SEEDED_TRIAGE_AGENT_ID = 'a1111111-1111-4111-8111-111111111111';
const SEEDED_COMPLETED_RUN_ID = 'da111111-1111-4111-8111-111111111111';
const SEEDED_PENDING_APPROVAL_ID = 'fa111111-1111-4111-8111-111111111111';

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  'docs/assets/screenshots',
);
const DEMOS_DIRECTORY = path.join(REPOSITORY_ROOT, 'docs/assets/demos');
const VIDEOS_DIRECTORY = path.join(REPOSITORY_ROOT, 'docs/assets/videos');
const TEMPORARY_FRAMES_ROOT = path.join(
  REPOSITORY_ROOT,
  'test-results/showcase-frames',
);

function resetDirectory(directoryPath) {
  fs.rmSync(directoryPath, { recursive: true, force: true });
  fs.mkdirSync(directoryPath, { recursive: true });
}

async function authenticateAndSelectWorkspace(page, themeMode = 'dark') {
  await page.addInitScript((initialTheme) => {
    window.localStorage.setItem('agentops-theme', initialTheme);
    window.localStorage.setItem('theme', initialTheme);
  }, themeMode);

  await page.goto(FRONTEND_BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate((initialTheme) => {
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, themeMode);

  await page.click('button:has-text("Sign in / Register")');
  await page.waitForURL('**/app**', { timeout: 15000 });
  await page.waitForSelector('#org-select', { timeout: 10000 });
  await page.selectOption('#org-select', SEEDED_ORGANIZATION_ID);
  await page.waitForTimeout(800);
  await page.evaluate((initialTheme) => {
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, themeMode);
}

async function navigateSidebar(page, linkLabel, urlPattern, headingText) {
  await page
    .locator('nav[aria-label="Primary navigation"]')
    .locator(`a:has-text("${linkLabel}")`)
    .click();
  await page.waitForURL(urlPattern, { timeout: 10000 });
  if (headingText) {
    await page.waitForSelector(`h1:has-text("${headingText}")`, {
      timeout: 10000,
    });
  }
  await page.waitForTimeout(550);
}

async function ensureVectorChunksIndexed() {
  console.log(
    '\n[Pre-Flight] Generating real 768-dim pgvector chunks via local Ollama (nomic-embed-text)...',
  );
  const databaseConnectionString =
    process.env.DATABASE_URL ||
    'postgres://agentops:password@172.23.84.67:5432/agentops';
  const ollamaBaseUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const embeddingModel =
    process.env.KNOWLEDGE_EMBED_MODEL || 'nomic-embed-text';

  const { Pool } = require(
    path.join(REPOSITORY_ROOT, 'apps/enterprise-agents-impl/node_modules/pg'),
  );
  const databasePool = new Pool({ connectionString: databaseConnectionString });

  try {
    const documentsResult = await databasePool.query(
      `SELECT id, organization_id, title, content, source_version
       FROM knowledge_documents
       WHERE organization_id = $1`,
      [SEEDED_ORGANIZATION_ID],
    );

    for (const documentRow of documentsResult.rows) {
      const embedResponse = await fetch(`${ollamaBaseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: embeddingModel,
          input: `${documentRow.title}\n\n${documentRow.content}`,
          truncate: false,
        }),
      });

      if (!embedResponse.ok) {
        throw new Error(`Ollama embed failed with status ${embedResponse.status}`);
      }

      const embedPayload = await embedResponse.json();
      const vectorValues = embedPayload.embeddings[0];
      const vectorLiteral = `[${vectorValues.join(',')}]`;

      await databasePool.query(
        `INSERT INTO knowledge_chunks (
           organization_id,
           document_id,
           chunk_index,
           content,
           embedding_model,
           source_version,
           embedding
         )
         VALUES ($1, $2, 0, $3, $4, $5, $6::vector)
         ON CONFLICT (document_id, source_version, chunk_index)
         DO UPDATE SET
           content = EXCLUDED.content,
           embedding_model = EXCLUDED.embedding_model,
           embedding = EXCLUDED.embedding`,
        [
          documentRow.organization_id,
          documentRow.id,
          documentRow.content,
          embeddingModel,
          documentRow.source_version,
          vectorLiteral,
        ],
      );

      await databasePool.query(
        `UPDATE knowledge_documents
         SET status = 'ready', index_model = $2, indexed_at = now(), index_error = NULL
         WHERE id = $1`,
        [documentRow.id, embeddingModel],
      );
    }
    console.log(
      `  ✓ Indexed ${documentsResult.rows.length} seeded runbooks into pgvector (${embeddingModel})`,
    );
  } finally {
    await databasePool.end();
  }
}

async function installDemoOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('showcase-demo-cursor')) return;

    const cursorElement = document.createElement('div');
    cursorElement.id = 'showcase-demo-cursor';
    cursorElement.style.cssText = [
      'position:fixed',
      'left:640px',
      'top:400px',
      'width:22px',
      'height:22px',
      'border-radius:9999px',
      'background:rgba(59,130,246,0.92)',
      'border:2.5px solid #ffffff',
      'box-shadow:0 0 0 6px rgba(59,130,246,0.28), 0 8px 20px rgba(0,0,0,0.45)',
      'pointer-events:none',
      'z-index:2147483647',
      'transform:translate(-50%,-50%)',
      'transition:left 220ms cubic-bezier(0.22,1,0.36,1), top 220ms cubic-bezier(0.22,1,0.36,1), transform 140ms ease',
    ].join(';');
    document.body.appendChild(cursorElement);

    const captionBanner = document.createElement('div');
    captionBanner.id = 'showcase-demo-caption';
    captionBanner.style.cssText = [
      'position:fixed',
      'bottom:22px',
      'right:24px',
      'padding:9px 16px',
      'border-radius:9999px',
      'background:rgba(9,9,11,0.92)',
      'color:#f8fafc',
      'border:1px solid rgba(96,165,250,0.55)',
      'box-shadow:0 12px 30px rgba(0,0,0,0.55)',
      'font-family:system-ui,-apple-system,sans-serif',
      'font-size:13px',
      'font-weight:600',
      'letter-spacing:0.01em',
      'pointer-events:none',
      'z-index:2147483646',
    ].join(';');
    captionBanner.textContent = 'AgentOps Enterprise AI Platform';
    document.body.appendChild(captionBanner);
  });
}

async function setDemoStepCaption(page, captionText) {
  await installDemoOverlay(page);
  await page.evaluate((nextText) => {
    const captionBanner = document.getElementById('showcase-demo-caption');
    if (captionBanner) {
      captionBanner.textContent = nextText;
    }
  }, captionText);
}

async function pointAndHighlightLocator(page, locator, captionText, snapFrame) {
  await installDemoOverlay(page);
  if (captionText) {
    await setDemoStepCaption(page, captionText);
  }
  const box = await locator.boundingBox();
  if (box) {
    const targetX = Math.round(box.x + Math.min(box.width * 0.45, 90));
    const targetY = Math.round(box.y + box.height * 0.5);
    await page.evaluate(
      ({ coordinateX, coordinateY }) => {
        const cursorElement = document.getElementById('showcase-demo-cursor');
        if (cursorElement) {
          cursorElement.style.left = `${coordinateX}px`;
          cursorElement.style.top = `${coordinateY}px`;
          cursorElement.style.transform = 'translate(-50%,-50%) scale(1)';
        }
      },
      { coordinateX: targetX, coordinateY: targetY },
    );
    await page.waitForTimeout(260);
    await snapFrame(420);

    // Subtle click pulse
    await page.evaluate(() => {
      const cursorElement = document.getElementById('showcase-demo-cursor');
      if (cursorElement) {
        cursorElement.style.transform = 'translate(-50%,-50%) scale(0.78)';
        cursorElement.style.background = 'rgba(16,185,129,0.95)';
      }
    });
    await page.waitForTimeout(120);
    await snapFrame(240);

    await page.evaluate(() => {
      const cursorElement = document.getElementById('showcase-demo-cursor');
      if (cursorElement) {
        cursorElement.style.transform = 'translate(-50%,-50%) scale(1)';
        cursorElement.style.background = 'rgba(59,130,246,0.92)';
      }
    });
  }
}

async function captureStaticScreenshots(browser) {
  console.log('\n[Phase 1/3] Capturing 2x Retina Dark & Light Mode Screenshots...');

  // 1A. Light Mode Workspace Overview (demonstrating Light Mode & official BrandLogo)
  const lightContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'light',
  });
  const lightPage = await lightContext.newPage();
  await authenticateAndSelectWorkspace(lightPage, 'light');
  await lightPage.waitForTimeout(500);
  await lightPage.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '02-workspace-overview-light.png'),
  });
  console.log('  ✓ 02-workspace-overview-light.png');
  await lightContext.close();

  // 1B. Dark Mode Flagship Suite
  const darkContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await darkContext.newPage();
  await authenticateAndSelectWorkspace(page, 'dark');

  // Workspace Overview (Dark Mode)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '02-workspace-overview-dark.png'),
  });
  console.log('  ✓ 02-workspace-overview-dark.png');

  // Hero Visual Workflow DAG Studio (with Triage Agent selected in Inspector)
  await page.goto(
    `${FRONTEND_BASE_URL}/app/workflows/${SEEDED_WORKFLOW_ID}/editor`,
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('.react-flow__node', { timeout: 10000 });
  const fitViewButton = page.locator('.react-flow__controls-fitview');
  if (await fitViewButton.isVisible()) {
    await fitViewButton.click();
  }
  const triageNodeButton = page.locator(
    'button:has-text("Triage Agent (agent)")',
  );
  if (await triageNodeButton.isVisible()) {
    await triageNodeButton.click();
  }
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '01-hero-workflow-dag.png'),
  });
  console.log('  ✓ 01-hero-workflow-dag.png');

  // Agent Configuration + Real Live Local Ollama Chat Playground
  await page.goto(`${FRONTEND_BASE_URL}/app/agents/${SEEDED_TRIAGE_AGENT_ID}`, {
    waitUntil: 'networkidle',
  });
  await page.waitForSelector('#agent-system-instructions', { timeout: 10000 });
  const promptInput = page.locator(`#agent-prompt-${SEEDED_TRIAGE_AGENT_ID}`);
  if (await promptInput.isVisible()) {
    await promptInput.fill(
      'Classify ticket TCK-9901: Primary PostgreSQL replica lag exceeded 45s in eu-west. Give a concise 2-line triage summary.',
    );
    await page.click('button:has-text("Ask agent")');
    await page
      .waitForSelector('p:has-text("Response ·")', { timeout: 25000 })
      .catch(() => null);
  }
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '03-agent-playground-live-chat.png'),
  });
  console.log('  ✓ 03-agent-playground-live-chat.png');

  // Durable Execution Run Detail & 4-Step Timeline
  await page.goto(
    `${FRONTEND_BASE_URL}/app/runs/${SEEDED_COMPLETED_RUN_ID}`,
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('text=Step timeline', { timeout: 10000 });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '04-run-step-timeline.png'),
  });
  console.log('  ✓ 04-run-step-timeline.png');

  // Four-Eyes Cryptographic Approval Gate
  await page.goto(
    `${FRONTEND_BASE_URL}/app/approvals/${SEEDED_PENDING_APPROVAL_ID}`,
    { waitUntil: 'networkidle' },
  );
  await page.waitForSelector('h1:has-text("Review approval")', {
    timeout: 10000,
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '05-four-eyes-approval.png'),
  });
  console.log('  ✓ 05-four-eyes-approval.png');

  // Hybrid RAG Knowledge Base + Live pgvector + FTS RRF Search
  await navigateSidebar(page, 'Knowledge', '**/app/knowledge**', 'Knowledge');
  await page.waitForFunction(
    () => document.querySelectorAll('#active-kb-select option').length > 1,
    { timeout: 10000 },
  );
  const knowledgeOptions = await page
    .locator('#active-kb-select option')
    .allInnerTexts();
  const reliabilityOption = knowledgeOptions.find((optionText) =>
    optionText.includes('Reliability Runbooks'),
  );
  if (reliabilityOption) {
    await page.selectOption('#active-kb-select', { label: reliabilityOption });
  }
  await page.waitForSelector('text=PostgreSQL Failover', { timeout: 10000 });
  const searchInput = page.getByRole('textbox', { name: 'Search query' });
  await searchInput.fill('PostgreSQL Failover standby replica');
  await page.click('button:has-text("Search")');
  const rrfBadge = page.locator('text=hybrid_pgvector_fts_rrf').first();
  await rrfBadge.waitFor({ timeout: 10000 }).catch(() => null);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '06-hybrid-rag-knowledge.png'),
  });
  console.log('  ✓ 06-hybrid-rag-knowledge.png');

  // LLMOps Evaluations Suite
  await navigateSidebar(
    page,
    'Evaluations',
    '**/app/evaluations**',
    'Evaluations',
  );
  await page.waitForSelector('text=Customer Triage Accuracy Benchmark', {
    timeout: 10000,
  });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '07-evaluations-benchmarks.png'),
  });
  console.log('  ✓ 07-evaluations-benchmarks.png');

  // FinOps Token Usage & Telemetry
  await navigateSidebar(page, 'Usage', '**/app/usage**', 'Usage');
  await page.waitForSelector('text=qwen2.5:3b', { timeout: 10000 }).catch(() => null);
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '08-usage-finops-tokens.png'),
  });
  console.log('  ✓ 08-usage-finops-tokens.png');

  // Immutable Compliance Audit Log
  await navigateSidebar(page, 'Audit', '**/app/audit**', 'Audit');
  await page.waitForSelector('table tbody tr', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '09-audit-compliance-log.png'),
  });
  console.log('  ✓ 09-audit-compliance-log.png');

  // Scalar OpenAPI 3.1 Interactive Reference (/reference)
  await page.goto(BACKEND_REFERENCE_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=AgentOps Enterprise API', { timeout: 12000 }).catch(() => null);
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIRECTORY, '10-scalar-openapi-reference.png'),
  });
  console.log('  ✓ 10-scalar-openapi-reference.png');

  await darkContext.close();
}

async function recordInteractiveDemoClip(browser, clipConfig) {
  const clipFramesDirectory = path.join(TEMPORARY_FRAMES_ROOT, clipConfig.name);
  resetDirectory(clipFramesDirectory);

  const rawVideoTempDir = path.join(
    TEMPORARY_FRAMES_ROOT,
    `${clipConfig.name}-video`,
  );
  resetDirectory(rawVideoTempDir);

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    recordVideo: {
      dir: rawVideoTempDir,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();
  const frameDurationsMs = [];
  let frameCounter = 0;

  async function snapFrame(durationMs) {
    frameCounter += 1;
    const paddedIndex = String(frameCounter).padStart(3, '0');
    await page.screenshot({
      path: path.join(clipFramesDirectory, `frame_${paddedIndex}.png`),
    });
    frameDurationsMs.push(durationMs);
  }

  await authenticateAndSelectWorkspace(page, 'dark');
  await installDemoOverlay(page);
  await clipConfig.runScenario(page, snapFrame);

  const recordedVideo = page.video();
  await context.close();

  if (recordedVideo) {
    const sourceVideoPath = await recordedVideo.path();
    const targetVideoPath = path.join(
      VIDEOS_DIRECTORY,
      `${clipConfig.name}.webm`,
    );
    fs.copyFileSync(sourceVideoPath, targetVideoPath);
    console.log(`  ✓ Video saved: docs/assets/videos/${clipConfig.name}.webm`);
  }

  return {
    frames_directory: clipFramesDirectory,
    output_gif_path: path.join(DEMOS_DIRECTORY, `${clipConfig.name}.gif`),
    frame_durations_ms: frameDurationsMs,
  };
}

function restoreCleanSuperSeed() {
  console.log('\n[Post-Capture] Restoring deterministic PostgreSQL Super Seed...');
  const databaseConnectionString =
    process.env.DATABASE_URL ||
    'postgres://agentops:password@172.23.84.67:5432/agentops';

  execFileSync(
    'node',
    [
      '-e',
      `const { Pool } = require('./apps/enterprise-agents-impl/node_modules/pg');
       (async () => {
         const pool = new Pool({ connectionString: process.env.DATABASE_URL });
         await pool.query('TRUNCATE TABLE organizations, users CASCADE;');
         await pool.end();
       })();`,
    ],
    {
      cwd: REPOSITORY_ROOT,
      env: { ...process.env, DATABASE_URL: databaseConnectionString },
      stdio: 'inherit',
    },
  );

  execFileSync(
    process.execPath,
    [path.join(REPOSITORY_ROOT, 'apps/enterprise-agents-impl/dist/database/seed.js')],
    {
      cwd: REPOSITORY_ROOT,
      env: { ...process.env, DATABASE_URL: databaseConnectionString },
      stdio: 'inherit',
    },
  );
}

async function runShowcaseCapture() {
  console.log('='.repeat(78));
  console.log(
    '🎬 ENTERPRISE AI AGENT PLATFORM — HEADLESS SHOWCASE SCRAPER & VIDEO RECORDER',
  );
  console.log('='.repeat(78));

  resetDirectory(SCREENSHOTS_DIRECTORY);
  resetDirectory(DEMOS_DIRECTORY);
  resetDirectory(VIDEOS_DIRECTORY);
  resetDirectory(TEMPORARY_FRAMES_ROOT);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    await ensureVectorChunksIndexed(browser);
    await captureStaticScreenshots(browser);

    console.log(
      '\n[Phase 2/3] Recording 3 Step-by-Step How-To-Use Product Videos (.webm + .gif)...',
    );

    // Clip 1: Visual Workflow Studio & Durable Run Step Timeline
    const workflowStudioRecording = await recordInteractiveDemoClip(browser, {
      name: '01-workflow-dag-and-execution',
      runScenario: async (page, snapFrame) => {
        const workflowsNav = page
          .locator('nav[aria-label="Primary navigation"]')
          .locator('a:has-text("Workflows")');
        await pointAndHighlightLocator(
          page,
          workflowsNav,
          '1/4 · Open Visual Workflow Pipelines',
          snapFrame,
        );
        await workflowsNav.click();
        await page.waitForURL('**/app/workflows**', { timeout: 10000 });
        await page.waitForSelector(
          'main h2:has-text("Autonomous Ticket Triage Pipeline")',
          { timeout: 10000 },
        );
        await snapFrame(750);

        const openEditorLink = page
          .locator(`main a[href*="${SEEDED_WORKFLOW_ID}"]`)
          .first();
        await pointAndHighlightLocator(
          page,
          openEditorLink,
          '2/4 · Launch React Flow DAG Studio',
          snapFrame,
        );
        await openEditorLink.click();
        await page.waitForURL('**/editor', { timeout: 10000 });
        await page.waitForSelector('.react-flow__node', { timeout: 10000 });
        await page.waitForTimeout(550);
        await snapFrame(800);

        const triageNodeBtn = page.locator(
          'button:has-text("Triage Agent (agent)")',
        );
        await pointAndHighlightLocator(
          page,
          triageNodeBtn,
          '3/4 · Inspect Agent & Vector Tool Nodes',
          snapFrame,
        );
        await triageNodeBtn.click();
        await page.waitForTimeout(450);
        await snapFrame(950);

        const vectorNodeBtn = page.locator(
          'button:has-text("Vector Search (tool)")',
        );
        if (await vectorNodeBtn.isVisible()) {
          await vectorNodeBtn.click();
          await page.waitForTimeout(400);
          await snapFrame(850);
        }

        const runsNav = page
          .locator('nav[aria-label="Primary navigation"]')
          .locator('a:has-text("Runs")');
        await pointAndHighlightLocator(
          page,
          runsNav,
          '4/4 · Inspect Durable 4-Step Execution Timeline',
          snapFrame,
        );
        await page.goto(
          `${FRONTEND_BASE_URL}/app/runs/${SEEDED_COMPLETED_RUN_ID}`,
          { waitUntil: 'networkidle' },
        );
        await page.waitForSelector('text=Step timeline', { timeout: 10000 });
        await installDemoOverlay(page);
        await setDemoStepCaption(
          page,
          '4/4 · Completed Run TCK-9901 — All 4 Checkpoints Verified',
        );
        await page.waitForTimeout(500);
        await snapFrame(1300);
      },
    });

    // Clip 2: Four-Eyes Cryptographic Approval Gate & Immutable Audit
    const fourEyesApprovalRecording = await recordInteractiveDemoClip(browser, {
      name: '02-four-eyes-cryptographic-approval',
      runScenario: async (page, snapFrame) => {
        const approvalsNav = page
          .locator('nav[aria-label="Primary navigation"]')
          .locator('a:has-text("Approvals")');
        await pointAndHighlightLocator(
          page,
          approvalsNav,
          '1/4 · Open Human-in-the-Loop Approvals Queue',
          snapFrame,
        );
        await approvalsNav.click();
        await page.waitForURL('**/app/approvals**', { timeout: 10000 });
        await page.waitForSelector('main a:has-text("connector.profile.read")', {
          timeout: 10000,
        });
        await snapFrame(750);

        const pendingLink = page
          .locator('main a:has-text("connector.profile.read")')
          .first();
        await pointAndHighlightLocator(
          page,
          pendingLink,
          '2/4 · Inspect Pending Sensitive Tool Gate (SHA-256 Locked)',
          snapFrame,
        );
        await pendingLink.click();
        await page.waitForSelector('h1:has-text("Review approval")', {
          timeout: 10000,
        });
        await snapFrame(850);

        const reasonInput = page.locator('input[maxlength="400"]');
        await pointAndHighlightLocator(
          page,
          reasonInput,
          '3/4 · Record Four-Eyes Security Justification',
          snapFrame,
        );
        await reasonInput.fill(
          'Approved by SecOps Lead — SHA-256 payload digest verified',
        );
        await snapFrame(750);

        const approveButton = page.locator('button:has-text("Approve")');
        await pointAndHighlightLocator(
          page,
          approveButton,
          '3/4 · Trigger Cryptographic Payload Confirmation',
          snapFrame,
        );
        await approveButton.click();
        await page.waitForSelector('div[role="dialog"]', { timeout: 5000 });
        await page.waitForTimeout(350);
        await snapFrame(950);

        const confirmDialogButton = page.locator(
          'div[role="dialog"] button:has-text("Approve exact payload")',
        );
        await pointAndHighlightLocator(
          page,
          confirmDialogButton,
          '4/4 · Sign & Resume Paused Workflow Execution',
          snapFrame,
        );
        await confirmDialogButton.click();
        await page.waitForTimeout(1100);
        await snapFrame(1000);

        await navigateSidebar(page, 'Audit', '**/app/audit**', 'Audit');
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
        await setDemoStepCaption(
          page,
          '4/4 · Decision Recorded in Append-Only Compliance Audit Log',
        );
        await snapFrame(1250);
      },
    });

    // Clip 3: Hybrid pgvector RAG Search + Live Local Ollama Chat + Dark/Light Theme Switch
    const ragChatThemeRecording = await recordInteractiveDemoClip(browser, {
      name: '03-hybrid-rag-and-live-agent-chat',
      runScenario: async (page, snapFrame) => {
        const knowledgeNav = page
          .locator('nav[aria-label="Primary navigation"]')
          .locator('a:has-text("Knowledge")');
        await pointAndHighlightLocator(
          page,
          knowledgeNav,
          '1/4 · Open ACL-Isolated Hybrid RAG Knowledge Base',
          snapFrame,
        );
        await knowledgeNav.click();
        await page.waitForURL('**/app/knowledge**', { timeout: 10000 });
        await page.waitForFunction(
          () => document.querySelectorAll('#active-kb-select option').length > 1,
          { timeout: 10000 },
        );
        const knowledgeOptions = await page
          .locator('#active-kb-select option')
          .allInnerTexts();
        const reliabilityOption = knowledgeOptions.find((optionText) =>
          optionText.includes('Reliability Runbooks'),
        );
        if (reliabilityOption) {
          await page.selectOption('#active-kb-select', {
            label: reliabilityOption,
          });
        }
        await page.waitForSelector('text=PostgreSQL Failover', {
          timeout: 10000,
        });
        await snapFrame(700);

        const searchInput = page.getByRole('textbox', { name: 'Search query' });
        await searchInput.scrollIntoViewIfNeeded();
        await pointAndHighlightLocator(
          page,
          searchInput,
          '2/4 · Query Hybrid pgvector + Full-Text RRF Search',
          snapFrame,
        );
        await searchInput.fill('PostgreSQL Failover standby replica');
        await page.click('button:has-text("Search")');
        await page
          .waitForSelector('text=hybrid_pgvector_fts_rrf', { timeout: 10000 })
          .catch(() => null);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(500);
        await snapFrame(1100);

        await page.goto(
          `${FRONTEND_BASE_URL}/app/agents/${SEEDED_TRIAGE_AGENT_ID}`,
          { waitUntil: 'networkidle' },
        );
        await page.waitForSelector('#agent-system-instructions', {
          timeout: 10000,
        });
        await installDemoOverlay(page);
        const promptInput = page.locator(
          `#agent-prompt-${SEEDED_TRIAGE_AGENT_ID}`,
        );
        await promptInput.scrollIntoViewIfNeeded();
        await pointAndHighlightLocator(
          page,
          promptInput,
          '3/4 · Test Live Agent Inference via Local Ollama (qwen2.5:3b)',
          snapFrame,
        );
        await promptInput.fill(
          'Ticket TCK-9901: Standby lag is 48s on pg-eu-west. Classify priority in 1 sentence.',
        );
        await snapFrame(650);

        const askButton = page.locator('button:has-text("Ask agent")');
        await askButton.click();
        await page
          .waitForSelector('p:has-text("Response ·")', { timeout: 25000 })
          .catch(() => null);
        await page.waitForTimeout(450);
        await snapFrame(1200);

        const themeToggleButton = page.getByRole('button', {
          name: /toggle theme/i,
        });
        await themeToggleButton.scrollIntoViewIfNeeded();
        await pointAndHighlightLocator(
          page,
          themeToggleButton,
          '4/4 · Instant Dark / Light Mode & Brand Logo Adaptation',
          snapFrame,
        );
        await themeToggleButton.click();
        await page.waitForTimeout(550);
        await snapFrame(1150);

        await themeToggleButton.click();
        await page.waitForTimeout(450);
        await snapFrame(950);
      },
    });

    console.log(
      '\n[Phase 3/3] Encoding Animated Showcase GIFs via Python Pillow...',
    );
    const manifestPath = path.join(TEMPORARY_FRAMES_ROOT, 'gif_manifest.json');
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          recordings: [
            workflowStudioRecording,
            fourEyesApprovalRecording,
            ragChatThemeRecording,
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    const pythonOutput = execFileSync(
      'python',
      [path.join(__dirname, 'encode_showcase_gifs.py'), manifestPath],
      { encoding: 'utf8' },
    );
    console.log(pythonOutput);

    fs.rmSync(TEMPORARY_FRAMES_ROOT, { recursive: true, force: true });
    restoreCleanSuperSeed();
    await ensureVectorChunksIndexed();
    console.log('🏁 Showcase capture & clean seed restoration completed successfully.');
  } finally {
    await browser.close();
  }
}

runShowcaseCapture().catch((error) => {
  console.error('Showcase capture failed:', error);
  process.exitCode = 1;
});
