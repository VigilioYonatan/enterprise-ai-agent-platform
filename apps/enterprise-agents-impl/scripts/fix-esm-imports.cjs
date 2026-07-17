const fs = require('node:fs');
const path = require('node:path');

const distDir = path.resolve(__dirname, '../packages/contracts/dist');

function getAllFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat?.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extensions));
    } else {
      if (extensions.some((ext) => filePath.endsWith(ext))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const replaceSpecifier = (match, prefix, specifier, suffix) => {
    if (!specifier.startsWith('.')) return match;
    if (specifier.endsWith('.js') || specifier.endsWith('.json')) return match;

    const fileDir = path.dirname(filePath);
    // Check if target directory with index.js exists
    const asDirIndex = path.resolve(fileDir, specifier, 'index.js');
    const asDirIndexDts = path.resolve(fileDir, specifier, 'index.d.ts');
    let fixedSpecifier = specifier;

    if (fs.existsSync(asDirIndex) || fs.existsSync(asDirIndexDts)) {
      fixedSpecifier = `${specifier}/index.js`;
    } else {
      fixedSpecifier = `${specifier}.js`;
    }

    changed = true;
    return `${prefix}${fixedSpecifier}${suffix}`;
  };

  // 1. from './foo'
  content = content.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, replaceSpecifier);

  // 2. import './foo'
  content = content.replace(
    /(import\s+['"])(\.[^'"]+)(['"])/g,
    replaceSpecifier,
  );

  // 3. dynamic import('./foo') or import("./foo")
  content = content.replace(
    /(import\s*\(\s*['"])(\.[^'"]+)(['"]\s*\))/g,
    replaceSpecifier,
  );

  // 4. TS type query: import('./foo').Type
  content = content.replace(
    /(import\s*\(\s*['"])(\.[^'"]+)(['"]\))/g,
    replaceSpecifier,
  );

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

if (!fs.existsSync(distDir)) {
  console.error(`Dist directory not found: ${distDir}`);
  process.exit(1);
}

const files = getAllFiles(distDir, ['.js', '.d.ts']);
console.log(`Fixing ESM imports in ${files.length} contracts files...`);
for (const file of files) {
  fixImportsInFile(file);
}
console.log('Successfully fixed ESM imports in @enterprise-agents/contracts.');
