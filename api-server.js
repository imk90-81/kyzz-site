// Standalone publish API server
// Run with: node api-server.js
import http from 'node:http';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '.');

const PORT = 3210;

function handlePublish(body) {
  const { date, files, build, push, dryRun } = body;
  
  if (!date || !files || !files.length) {
    return { success: false, output: 'Missing required fields: date, files' };
  }

  const results = [];
  let hasError = false;

  for (const file of files) {
    const { source, html, targets } = file;
    
    const args = ['--date', date, '--target', targets.join(','), '--source', source];
    if (html) args.push('--html', html);
    if (build) args.push('--build');
    if (push) args.push('--push');
    if (dryRun) args.push('--dry-run');

    const scriptPath = path.join(ROOT, 'scripts/publish.js');
    const cmd = 'node "' + scriptPath + '" ' + args.map(function(a) { return '"' + a.replace(/"/g, '\\"') + '"'; }).join(' ');

    try {
      const output = execSync(cmd, {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 120000,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      results.push({
        source,
        targets,
        success: true,
        output: output.trim()
      });
    } catch (e) {
      hasError = true;
      const errOutput = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') || String(e.message);
      results.push({
        source: source || 'unknown',
        targets: targets || [],
        success: false,
        output: errOutput
      });
    }
  }

  const summary = results.map(r => {
    const status = r.success ? '[OK]' : '[FAIL]';
    return `${status} [${r.targets.join(',')}] ${r.source}\n${r.output}`;
  }).join('\n\n---\n\n');

  return { success: !hasError, output: summary };
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/publish') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, output: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      const result = handlePublish(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, output: 'Invalid JSON: ' + e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Publish API running at http://localhost:${PORT}/api/publish`);
});
