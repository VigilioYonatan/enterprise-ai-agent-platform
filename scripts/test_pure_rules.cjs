/** Offline focused smoke tests of dependency-free TypeScript business rules.
 * Requires the TypeScript compiler API, available after installing devDependencies
 * or through NODE_PATH pointing to a system installation.
 * This DOES NOT replace Vitest, integration or E2E tests.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(
  require.resolve('typescript', {
    paths: [
      __dirname,
      path.join(root, 'apps/enterprise-agents-impl/node_modules'),
      path.join(root, 'apps/enterprise-agents-web/node_modules'),
    ],
  }),
);
function load(relative){
 const text=fs.readFileSync(path.join(root,relative),'utf8');
 const js=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};
 (new Function('module','exports','require',js))(module,module.exports,()=>{throw Error('Offline smoke target imported a runtime dependency')});
 return module.exports;
}
let assertions=0;
function check(fn){fn(); assertions++}
const membership=load('apps/enterprise-agents-impl/src/modules/memberships/domain/policies/membership.policy.ts');
check(()=>assert.equal(membership.canChangeRole('owner','editor','admin'),true));
check(()=>assert.equal(membership.canChangeRole('admin','editor','owner'),false));
check(()=>assert.equal(membership.canChangeRole('viewer','viewer','admin'),false));
const approval=load('apps/enterprise-agents-impl/src/modules/approvals/domain/policies/approval.policy.ts');
const future=new Date(Date.now()+120000);
check(()=>assert.equal(approval.mayDecideApproval('owner','a','a',future,'pending'),false));
check(()=>assert.equal(approval.mayDecideApproval('admin','a','b',future,'pending'),true));
check(()=>assert.equal(approval.mayDecideApproval('admin','a','b',new Date(0),'pending'),false));
const runs=load('apps/enterprise-agents-impl/src/modules/runs/domain/services/run-state.service.ts');
check(()=>assert.equal(runs.canTransition('completed','queued'),false));
check(()=>assert.equal(runs.canTransition('waiting_approval','queued'),true));
check(()=>assert.equal(runs.nextNode([{source:'c',target:'a',when:'true'},{source:'c',target:'b',when:'false'}],'c',false),'b'));
check(()=>assert.throws(()=>runs.nextNode([{source:'s',target:'a'},{source:'s',target:'b'}],'s')));
const graph=load('apps/enterprise-agents-web/src/features/workflows/workflow-json.ts');
check(()=>assert.deepEqual(graph.parseGraphJson('{"nodes":[],"edges":[]}'),{nodes:[],edges:[]}));
check(()=>assert.throws(()=>graph.parseGraphJson('{"nodes":3,"edges":[]}')));
const idempotency=load('apps/enterprise-agents-impl/src/modules/runs/domain/services/canonical-json.service.ts');
check(()=>assert.equal(idempotency.canonicalJson({a:1,b:2}),idempotency.canonicalJson({b:2,a:1})));
check(()=>assert.notEqual(idempotency.canonicalJson({a:1,b:2}),idempotency.canonicalJson({a:1,b:3})));
console.log(`PASS offline pure rule checks: ${assertions} assertions`);
