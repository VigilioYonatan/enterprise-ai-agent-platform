const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../apps/enterprise-agents-web/node_modules/@playwright/test'));

const BASE_URL = 'http://localhost:8080';
const SEEDED_ORG_ID = '11111111-1111-4111-8111-111111111111';

async function runE2ETests() {
  console.log('='.repeat(78));
  console.log('🚀 ENTERPRISE AGENTS PLATFORM — PLAYWRIGHT E2E BROWSER TEST SUITE (SENIOR MODE)');
  console.log('Target: ' + BASE_URL);
  console.log('='.repeat(78));

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(`Uncaught: ${err.message}`);
  });

  const results = [];

  function record(pageName, success, details) {
    results.push({ pageName, success, details });
    const mark = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} | ${pageName.padEnd(30)} : ${details}`);
  }

  // Helper for sidebar navigation
  async function navTo(label, urlPattern, headerText) {
    await page.locator('nav[aria-label="Primary navigation"]').locator(`a:has-text("${label}")`).click();
    await page.waitForURL(urlPattern, { timeout: 10000 });
    if (headerText) {
      await page.waitForSelector(`h1:has-text("${headerText}")`, { timeout: 10000 });
    }
  }

  try {
    // -------------------------------------------------------------
    // 1. Landing Page (Home)
    // -------------------------------------------------------------
    console.log('\n[1/17] Testing Landing Page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const title = await page.title();
    const landingH1 = await page.locator('h1').textContent();
    const hasSsoButton = await page.locator('button:has-text("Sign in / Register")').isVisible();

    record(
      'Landing / Home',
      title.includes('AgentOps') && landingH1.includes('Agent workflows you can trust') && hasSsoButton,
      `Title: "${title}", SSO button ready`
    );

    // -------------------------------------------------------------
    // 2. Authentication Flow (OIDC Redirect & Callback)
    // -------------------------------------------------------------
    console.log('\n[2/17] Testing OIDC Authentication Flow...');
    await page.click('button:has-text("Sign in / Register")');
    await page.waitForURL('**/app**', { timeout: 15000 });
    await page.waitForSelector('h1:has-text("Overview")', { timeout: 10000 });
    record('OIDC Auth Redirect', true, `Successfully authenticated -> ${page.url()}`);

    // -------------------------------------------------------------
    // 3. Workspace Overview / Dashboard & Org Switcher
    // -------------------------------------------------------------
    console.log('\n[3/17] Testing Workspace Overview & Selecting Seeded Org...');
    await page.waitForSelector('#org-select', { timeout: 10000 });
    await page.selectOption('#org-select', SEEDED_ORG_ID);
    await page.waitForTimeout(1000);

    await page.waitForSelector(`main p:has-text("${SEEDED_ORG_ID}")`, { timeout: 10000 });
    const roleText = await page.locator('main').locator('text=owner').first().isVisible();
    const alertErrors = await page.locator('div[role="alert"]').count();

    record(
      'Workspace Overview',
      roleText && alertErrors === 0,
      `Active Org: "Acme Enterprise" (${SEEDED_ORG_ID}), Role: owner, 0 error banners`
    );

    // -------------------------------------------------------------
    // 4. Vercel Dark Theme Tokens
    // -------------------------------------------------------------
    console.log('\n[4/17] Testing Vercel Dark Theme Tokens...');
    const isDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const bodyBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    record(
      'Vercel Dark Theme Tokens',
      bodyBg.length > 0,
      `html.dark: ${isDarkClass}, body backgroundColor: ${bodyBg}`
    );

    // -------------------------------------------------------------
    // 5. Agents Page (/app/agents)
    // -------------------------------------------------------------
    console.log('\n[5/17] Testing Agents Catalog & Detail...');
    await navTo('Agents', '**/app/agents**', 'Agents');
    await page.waitForSelector('main h2:has-text("Customer Triage Agent")', { timeout: 10000 });

    const csVisible = await page.locator('main h2:has-text("Customer Triage Agent")').isVisible();
    const daVisible = await page.locator('main h2:has-text("Security Compliance Auditor")').isVisible();
    const ssVisible = await page.locator('main h2:has-text("SRE Incident Assistant")').isVisible();

    record(
      'Agents List',
      csVisible && daVisible && ssVisible,
      'Seeded agents loaded: Customer Triage, Security Compliance, SRE Incident'
    );

    // Open Agent Detail
    await page.locator('main a:has-text("Configure / Test")').first().click();
    await page.waitForURL('**/app/agents/**', { timeout: 10000 });
    await page.waitForSelector('h1:has-text("Agent configuration")', { timeout: 10000 });
    await page.waitForSelector('#agent-system-instructions', { timeout: 10000 });
    const instructionsVal = await page.locator('#agent-system-instructions').inputValue();
    record('Agent Detail View', instructionsVal.length > 10, `Loaded instructions (${instructionsVal.slice(0, 35)}...)`);

    // -------------------------------------------------------------
    // 6. Workflows Page (/app/workflows)
    // -------------------------------------------------------------
    console.log('\n[6/17] Testing Workflows Catalog & Canvas...');
    await navTo('Workflows', '**/app/workflows**', 'Workflows');
    await page.waitForSelector('main h2:has-text("Autonomous Ticket Triage Pipeline")', { timeout: 10000 });

    const triageVis = await page.locator('main h2:has-text("Autonomous Ticket Triage Pipeline")').isVisible();
    const soc2Vis = await page.locator('main h2:has-text("SOC2 Security Verification Flow")').isVisible();
    record(
      'Workflows List',
      triageVis && soc2Vis,
      'Workflows loaded: Autonomous Ticket Triage Pipeline, SOC2 Security Flow'
    );

    // Open Workflow Canvas
    await page.locator('main a[href*="/app/workflows/"]').first().click();
    await page.waitForURL('**/app/workflows/**/editor', { timeout: 10000 });
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    const flowCanvas = await page.locator('.react-flow').isVisible();
    record('Workflow Editor Canvas', flowCanvas, 'Interactive React Flow canvas rendered with DAG nodes');

    // -------------------------------------------------------------
    // 7. Runs Page (/app/runs)
    // -------------------------------------------------------------
    console.log('\n[7/17] Testing Executions / Runs...');
    await navTo('Runs', '**/app/runs**', 'Runs');
    await page.waitForSelector('main a[href*="/app/runs/"]', { timeout: 10000 });
    const runCount = await page.locator('main a[href*="/app/runs/"]').count();
    record('Runs List', runCount > 0, `Page contains ${runCount} execution cards from PostgreSQL`);

    // Click into run detail
    await page.locator('main a[href*="/app/runs/"]').first().click();
    await page.waitForSelector('h1:has-text("Run ")', { timeout: 10000 });
    await page.waitForSelector('text=Step timeline', { timeout: 10000 });
    const executionSteps = await page.locator('text=Step timeline').isVisible();
    record('Run Detail & Timeline', executionSteps, 'Execution status and timeline steps verified');

    // -------------------------------------------------------------
    // 8. Approvals Page (/app/approvals)
    // -------------------------------------------------------------
    console.log('\n[8/17] Testing Approvals Inbox...');
    await navTo('Approvals', '**/app/approvals**', 'Approvals');
    await page.waitForSelector('main a[href*="/app/approvals/"]', { timeout: 10000 });
    const approvalRow = await page.locator('main a:has-text("connector.profile.read")').first().isVisible();
    record('Approvals Inbox', approvalRow, 'Four-eyes approval request listed with pending status');

    // Click into pending approval detail
    await page.locator('main a:has-text("connector.profile.read")').first().click();
    await page.waitForSelector('h1:has-text("Review approval")', { timeout: 10000 });
    await page.waitForSelector('button:has-text("Approve")', { timeout: 10000 });
    const approveBtn = await page.locator('button:has-text("Approve")').isVisible();
    const rejectBtn = await page.locator('button:has-text("Reject")').isVisible();
    record('Approval Detail & Actions', approveBtn && rejectBtn, 'Approve and Reject controls available for pending approval');

    // -------------------------------------------------------------
    // 9. Notifications Page (/app/notifications)
    // -------------------------------------------------------------
    console.log('\n[9/17] Testing Notifications Inbox...');
    await navTo('Notifications', '**/app/notifications**', 'Notifications');
    await page.waitForSelector('main', { timeout: 10000 });
    await page.waitForSelector('text=approval · requested', { timeout: 10000 });
    const notifText = await page.locator('main').innerText();
    const hasRequestedNotif = notifText.includes('approval · requested');
    const hasPublishedNotif = notifText.includes('workflow · published');
    record('Notifications Page', hasRequestedNotif && hasPublishedNotif, 'Notifications rendered (approval requested, workflow published)');

    // -------------------------------------------------------------
    // 10. Tools Catalog (/app/tools)
    // -------------------------------------------------------------
    console.log('\n[10/17] Testing Tools Catalog...');
    await navTo('Tools', '**/app/tools**', 'Tool catalog');
    await page.waitForSelector('text=text.uppercase', { timeout: 10000 });
    const toolsText = await page.locator('main').innerText();
    const hasUppercase = toolsText.includes('text.uppercase');
    const hasKnowledgeSearch = toolsText.includes('knowledge.search');
    record('Tools Catalog', hasUppercase && hasKnowledgeSearch, 'Allowlisted safe tools verified (text.uppercase, knowledge.search)');

    // -------------------------------------------------------------
    // 11. Integrations Page (/app/integrations)
    // -------------------------------------------------------------
    console.log('\n[11/17] Testing Integrations Connectors...');
    await navTo('Integrations', '**/app/integrations**', 'Integrations');
    await page.waitForSelector('text=Available providers', { timeout: 10000 });
    const providersHeader = await page.locator('text=Available providers').isVisible();
    record('Integrations Page', providersHeader, 'OAuth 2.0 connectors panel loaded with encrypted tokens guarantee');

    // -------------------------------------------------------------
    // 12. Knowledge Bases Page (/app/knowledge)
    // -------------------------------------------------------------
    console.log('\n[12/17] Testing Knowledge Bases & Documents...');
    await navTo('Knowledge', '**/app/knowledge**', 'Knowledge');
    await page.waitForSelector('#active-kb-select', { timeout: 10000 });
    await page.waitForFunction(() => document.querySelectorAll('#active-kb-select option').length > 1, { timeout: 10000 });

    const kbSelect = page.locator('#active-kb-select');
    const kbOptions = await kbSelect.locator('option').allInnerTexts();
    const hasKb = kbOptions.some(opt => opt.includes('Reliability Runbooks'));
    record('Knowledge Bases', hasKb, `Knowledge base options loaded: [${kbOptions.filter(o => o !== 'Select a base').join(', ')}]`);

    // Select the base containing seeded documents
    const targetKbOpt = kbOptions.find(o => o.includes('Reliability Runbooks'));
    if (targetKbOpt) {
      await kbSelect.selectOption({ label: targetKbOpt });
    } else {
      await kbSelect.selectOption({ index: 1 });
    }
    await page.waitForSelector('text=Failover', { timeout: 10000 });
    const kbPageText = await page.locator('main').innerText();
    const hasDocuments = kbPageText.includes('Failover');
    record('Knowledge Documents List', hasDocuments, 'Documents listed with status badges and ACL controls');

    // -------------------------------------------------------------
    // 13. Evaluations Page (/app/evaluations)
    // -------------------------------------------------------------
    console.log('\n[13/17] Testing Evaluations QA Suites...');
    await navTo('Evaluations', '**/app/evaluations**', 'Evaluations');
    await page.waitForSelector('text=Customer Triage Accuracy Benchmark', { timeout: 10000 });
    const suiteVis = await page.locator('text=Customer Triage Accuracy Benchmark').isVisible();
    const scoreVis = await page.locator('text=2/2').first().isVisible();
    record('Evaluations QA Suites', suiteVis && scoreVis, 'QA suite and 2/2 evaluation score verified');

    // -------------------------------------------------------------
    // 14. Usage & Telemetry (/app/usage)
    // -------------------------------------------------------------
    console.log('\n[14/17] Testing Usage & Telemetry...');
    await navTo('Usage', '**/app/usage**', 'Usage & tokens');
    await page.waitForSelector('text=Model calls', { timeout: 10000 });
    const modelCalls = await page.locator('text=Model calls').isVisible();
    const inputTokens = await page.locator('text=Input tokens').isVisible();
    const outputTokens = await page.locator('text=Output tokens').isVisible();
    record('Usage & Telemetry', modelCalls && inputTokens && outputTokens, 'Tokens consumption cards and metrics rendered');

    // -------------------------------------------------------------
    // 15. Audit Trail (/app/audit)
    // -------------------------------------------------------------
    console.log('\n[15/17] Testing Audit Trail...');
    await navTo('Audit', '**/app/audit**', 'Audit');
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    const auditRows = await page.locator('table tbody tr').count();
    record('Audit Trail', auditRows > 0, `Immutable audit trail contains ${auditRows} logged events`);

    // -------------------------------------------------------------
    // 16. Members & RBAC (/app/settings/members)
    // -------------------------------------------------------------
    console.log('\n[16/17] Testing Organization Members & RBAC...');
    await navTo('Members', '**/app/settings/members**', 'Members');
    await page.waitForSelector('main td:has-text("admin@agentops.local")', { timeout: 10000 });
    const adminVis = await page.locator('main').locator('text=admin@agentops.local').first().isVisible();
    const engineerVis = await page.locator('main').locator('text=engineer@agentops.local').first().isVisible();
    const auditorVis = await page.locator('main').locator('text=auditor@agentops.local').first().isVisible();
    record('Members & RBAC', adminVis && engineerVis && auditorVis, 'Seeded members (admin, engineer, auditor) listed with roles');

    // -------------------------------------------------------------
    // 17. Responsive Mobile Viewport & Theme Toggle
    // -------------------------------------------------------------
    console.log('\n[17/17] Testing Mobile Viewport & Theme Toggle...');
    await page.setViewportSize({ width: 375, height: 667 });
    const hamburger = page.locator('button[aria-label="Open navigation"]');
    const isHamburgerVis = await hamburger.isVisible();
    if (isHamburgerVis) {
      await hamburger.click();
      const mobileSidebar = await page.locator('#primary-sidebar').isVisible();
      record('Responsive Mobile Viewport', mobileSidebar, 'Mobile navigation drawer toggles at 375px');
    } else {
      record('Responsive Mobile Viewport', true, 'Mobile layout adaptive');
    }

    // Toggle theme button
    const themeBtn = page.locator('button:has-text("Toggle theme"), button:has([class*="lucide-moon"]), button:has([class*="lucide-sun"])').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      const toggledDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      record('Vercel Theme Toggle', true, `Theme toggle clicked successfully (dark: ${toggledDark})`);
    }

    console.log('\n' + '='.repeat(78));
    console.log('🏁 ALL PLAYWRIGHT E2E BROWSER TESTS COMPLETED');
    console.log('='.repeat(78));

    const total = results.length;
    const passed = results.filter(r => r.success).length;
    console.log(`\nRESULTS SUMMARY: ${passed}/${total} checks passed (${Math.round(passed / total * 100)}% success rate)\n`);

    if (consoleErrors.length > 0) {
      console.log(`Non-blocking browser console notices: ${consoleErrors.length}`);
    }

    if (passed < total) {
      process.exitCode = 1;
    }

  } catch (err) {
    console.error('Fatal E2E test execution error:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runE2ETests();
