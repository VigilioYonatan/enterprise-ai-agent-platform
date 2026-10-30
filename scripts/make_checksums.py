#!/usr/bin/env python3
"""Regenerate two non-self-referential SHA-256 inventories of this source package."""
from hashlib import sha256
from pathlib import Path

r = Path(__file__).resolve().parent.parent
skip = {'MANIFEST.sha256', 'CHECKSUMS.sha256'}
ignored_dirs = {
    'node_modules',
    '.git',
    '__pycache__',
    'dist',
    'coverage',
    '.pytest_cache',
    'playwright-report',
    'test-results',
}
files = sorted(
    (
        p
        for p in r.rglob('*')
        if p.is_file()
        and not any(part in ignored_dirs for part in p.relative_to(r).parts)
        and p.relative_to(r).as_posix() not in skip
    ),
    key=lambda p: p.relative_to(r).as_posix(),
)
rows = [f'{sha256(p.read_bytes()).hexdigest()}  {p.relative_to(r).as_posix()}' for p in files]
(r / 'MANIFEST.sha256').write_text('\n'.join(rows) + '\n', encoding='utf-8')
# Include MANIFEST in the second list but never CHECKSUMS itself.
manifest = r / 'MANIFEST.sha256'
rows.append(f'{sha256(manifest.read_bytes()).hexdigest()}  MANIFEST.sha256')
(r / 'CHECKSUMS.sha256').write_text('\n'.join(sorted(rows)) + '\n', encoding='utf-8')
print('Manifest:', len(files), 'files; checksums:', len(rows))
