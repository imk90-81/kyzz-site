import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

export async function POST({ request }) {
  let body;
  
  // Read body as text first
  const text = await request.text();
  
  try {
    body = JSON.parse(text);
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      output: 'Invalid JSON: ' + e.message + '\nReceived: ' + text.substring(0, 200)
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { date, files, build, push, dryRun } = body;
  
  if (!date || !files || !files.length) {
    return new Response(JSON.stringify({
      success: false,
      output: 'Missing required fields: date, files'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
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
    const cmd = `node "${scriptPath}" ${args.map(a => '"' + a.replace(/"/g, '\\"') + '"').join(' ')}`;

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
      results.push({
        source,
        targets,
        success: false,
        output: (e.stdout || '') + (e.stderr || '') || String(e.message)
      });
    }
  }

  const summary = results.map(r => {
    const status = r.success ? '[OK]' : '[FAIL]';
    return `${status} [${r.targets.join(',')}] ${source}\n${r.output}`;
  }).join('\n\n---\n\n');

  return new Response(JSON.stringify({
    success: !hasError,
    output: summary
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
