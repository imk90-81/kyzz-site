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
  const { date, sources, htmls, build, push, dryRun } = body;

  if (!date) {
    return { success: false, output: 'Missing required field: date' };
  }

  const results = [];
  let hasError = false;

  // 处理 sources（.md 文件，发布到 daily/blog，不支持 reports）
  for (const src of (sources || [])) {
    const { path: srcPath, name, targets = [] } = src;

    if (!srcPath) continue;

    // reports 不从 sources 发布（需 html 文件）
    const realTargets = targets.filter(t => t !== 'reports');
    if (realTargets.length === 0) {
      // md 文件被放到了 reports 栏目 -> 警告
      results.push({
        source: srcPath,
        targets: ['reports'],
        success: false,
        output: '⚠️ 类型不匹配：Reports 栏目需使用 .html 文件，.md 文件无法发布到此栏目'
      });
      hasError = true;
      continue;
    }

    const args = ['--date', date, '--target', realTargets.join(','), '--source', srcPath];
    if (name) args.push('--name', name);
    if (build) args.push('--build');
    if (push) args.push('--push');
    if (dryRun) args.push('--dry-run');

    runScript(args, srcPath, realTargets, results, hasError);
  }

  // 处理 htmls（.html 文件，发布到 reports 或 blog）
  for (const h of (htmls || [])) {
    const { path: htmlPath, name, targets: hTargets = [] } = h;
    if (!htmlPath) continue;

    // 只接受 reports/blog 作为 html 发布目标
    const validTargets = hTargets.filter(t => t === 'reports' || t === 'blog');
    if (validTargets.length === 0) {
      results.push({
        source: htmlPath, targets: hTargets,
        success: false,
        output: '⚠️ 类型不匹配：Daily/Blog 栏目需使用 .md 文件，.html 文件无法发布到此栏目'
      });
      hasError = true;
      continue;
    }

    const args = ['--date', date, '--target', validTargets.join(','), '--html', htmlPath];
    if (name) args.push('--name', name);
    if (build) args.push('--build');
    if (push) args.push('--push');
    if (dryRun) args.push('--dry-run');

    runScript(args, htmlPath, validTargets, results, hasError);
  }

  if (results.length === 0) {
    return { success: false, output: 'No files to publish. Add at least one file to a column.' };
  }

  const summary = results.map(r => {
    const status = r.success ? '[OK]' : '[FAIL]';
    return `${status} [${r.targets.join(',')}] ${r.source}\n${r.output}`;
  }).join('\n\n---\n\n');

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, output: summary };
}

function runScript(args, src, targets, results, hasError) {
  const scriptPath = path.join(ROOT, 'scripts/publish.js');
  // 重新构造命令，用引号包裹每个参数
  const cmd = 'node "' + scriptPath + '" ' + args.map(function(a) {
    return '"' + String(a).replace(/"/g, '\\"') + '"';
  }).join(' ');

  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    results.push({ source: src, targets, success: true, output: output.trim() });
  } catch (e) {
    hasError = true;
    const errOutput = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '') || String(e.message);
    results.push({ source: src, targets, success: false, output: errOutput });
  }
}

const server = http.createServer((req, res) => {
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
