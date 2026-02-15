/* 🧬 S-DNA: AOI-2026-0214-SOL-SENT-01 | module: gen_manifest | owner: Aoineco */

import fs from 'node:fs';
import { execSync } from 'node:child_process';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const latestReport = arg('--latest-report') || '';
const demoUrl = arg('--demo-url') || '';

const sdna = process.env.SDNA_ID || 'AOI-2026-0214-SOL-SENT-01';
const repo = process.env.REPO_URL || 'https://github.com/edmonddantesj/solana-sentinel';
const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();

const existing = fs.existsSync('manifest.json') ? JSON.parse(fs.readFileSync('manifest.json', 'utf-8')) : {};

const manifest = {
  ...existing,
  sdna,
  repo,
  commit,
  created_at: new Date().toISOString(),
  artifacts: {
    ...(existing.artifacts || {}),
    latest_report: latestReport || (existing.artifacts || {}).latest_report || '',
    demo_video: demoUrl || (existing.artifacts || {}).demo_video || '',
    proof_urls: (existing.artifacts || {}).proof_urls || [],
    notes: (existing.artifacts || {}).notes || ''
  }
};

fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
console.log('Wrote manifest.json (commit populated)');
