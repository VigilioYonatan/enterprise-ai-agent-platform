#!/usr/bin/env python3
"""File-by-file byte, encoding, format and integrity audit of an AgentOps source tree.

A full read/parse does not certify semantic correctness or runtime. The generated
inventory records the inspection class separately from verified behavior.
"""
from __future__ import annotations
import hashlib
import io
import json
import re
import sys
import wave
from collections import Counter
from pathlib import Path

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
exclude = {'audit/FILE_AUDIT.jsonl', 'audit/FILE_AUDIT_SUMMARY.json', 'MANIFEST.sha256', 'CHECKSUMS.sha256'}
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
records = []

try:
    import yaml
except ImportError:
    yaml = None


class StrictLoader(yaml.SafeLoader if yaml is not None else object):
    pass


if yaml:
    def unique(loader, node):
        output = {}
        for keynode, valnode in node.value:
            key = loader.construct_object(keynode)
            if key in output:
                raise ValueError(f'duplicate YAML key {key!r} at line {keynode.start_mark.line + 1}')
            output[key] = loader.construct_object(valnode)
        return output

    StrictLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique)

product_code = ('apps/', 'enterprise-agents-deploy/', 'platform-ops/', 'prod-local/', 'scripts/')
source_extensions = {
    '.ts', '.tsx', '.js', '.mjs', '.cjs', '.py', '.sh', '.sql', '.css', '.html',
    '.yaml', '.yml', '.json', '.conf', '.md', '.txt', '.feature', '.example',
    '.gd', '.tscn', '.godot', '.rs', '.php', '.jsonl', '.cpp', '.hpp', '.toml',
    '.sha256', '.nvmrc',
}
text_filenames = {'Dockerfile', 'Caddyfile', '.dockerignore', '.gitignore', '.gitattributes', '.nvmrc'}

for p in sorted(root.rglob('*')):
    if not p.is_file():
        continue
    rel_parts = p.relative_to(root).parts
    if any(part in ignored_dirs for part in rel_parts):
        continue
    rel = p.relative_to(root).as_posix()
    if rel in exclude:
        continue
    raw = p.read_bytes()
    rec = {
        'path': rel,
        'bytes': len(raw),
        'sha256': hashlib.sha256(raw).hexdigest(),
        'class': 'text' if p.suffix in source_extensions or p.name in text_filenames else 'binary',
        'check': 'READ',
        'findings': [],
    }
    if p.is_symlink():
        rec['findings'].append('symlink must be separately verified')
    if not raw:
        rec['findings'].append('empty file (inspect intent)')
    if rec['class'] == 'text':
        try:
            value = raw.decode('utf-8', errors='strict')
            rec['lines'] = len(value.splitlines())
            rec['check'] = 'UTF8_FULL_READ'
            if '\x00' in value:
                rec['findings'].append('NUL byte in text')
        except UnicodeDecodeError as error:
            rec['check'] = 'DECODE_ERROR'
            rec['findings'].append(str(error))
            value = ''
        if value and p.suffix == '.json':
            try:
                json.loads(value)
                rec['check'] = 'JSON_PARSED'
            except Exception as error:
                rec['findings'].append('JSON error: ' + str(error))
        if value and p.suffix == '.jsonl':
            try:
                for row in value.splitlines():
                    if row.strip():
                        json.loads(row)
                rec['check'] = 'JSONL_PARSED'
            except Exception as error:
                rec['findings'].append('JSONL error: ' + str(error))
        if value and p.suffix in {'.yaml', '.yml'}:
            if yaml:
                try:
                    yaml.load(value, Loader=StrictLoader)
                    rec['check'] = 'YAML_PARSED_STRICT'
                except Exception as error:
                    rec['findings'].append('YAML error: ' + str(error))
            else:
                rec['findings'].append('YAML parser unavailable')
        if value and rel.startswith(product_code) and p.suffix in {'.ts', '.tsx', '.js', '.mjs', '.cjs', '.sh', '.py'}:
            hits = []
            for expression in (r'\bTODO\b', r'\bFIXME\b', r'\bTBD\b', r'\bnot\s+implemented\b', r'\breturn\s+undefined\b'):
                hits += [m.start() for m in re.finditer(expression, value, re.I)]
            if hits:
                rec['findings'].append(f'candidate incomplete markers: {len(hits)} (manual review)')
    elif p.suffix == '.wav':
        try:
            with wave.open(io.BytesIO(raw), 'rb') as w:
                rec['check'] = f'WAV_OPENED_{w.getnframes()}_FRAMES'
        except Exception as error:
            rec['findings'].append('WAV error: ' + str(error))
    else:
        rec['check'] = 'BINARY_BYTES_READ_UNRECOGNIZED' if rec['class'] == 'binary' else rec['check']
    records.append(rec)

out = root / 'audit'
out.mkdir(exist_ok=True)
with (out / 'FILE_AUDIT.jsonl').open('w', encoding='utf-8', newline='\n') as f:
    for record in records:
        f.write(json.dumps(record, ensure_ascii=False) + '\n')

summary = {
    'scanned_files': len(records),
    'classification_counts': dict(Counter(x['class'] for x in records)),
    'check_counts': dict(Counter(x['check'] for x in records)),
    'files_with_flags': [{'path': x['path'], 'findings': x['findings']} for x in records if x['findings']],
    'notice': 'This checks every file at byte and applicable format level, NOT full semantic correctness or runtime behavior.',
}
(out / 'FILE_AUDIT_SUMMARY.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in summary.items() if k != 'notice'}, ensure_ascii=False, indent=2))
if summary['files_with_flags']:
    print('Flagged examples:', summary['files_with_flags'][:12])
