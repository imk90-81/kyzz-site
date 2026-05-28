// Standalone publish API server
// Run with: node api-server.js
import http from 'node:http';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '.');

const PORT = 33200;

function handlePublish(body) {
  const { date, sources, htmls, build, push, dryRun } = body;

  if (!date) {
    return { success: false, output: 'Missing required field: date' };
  }

  const results = [];
  let hasError = false;

  // 处理 sources（.md 文件内容，发布到 daily/blog）
  for (const src of (sources || [])) {
    const { content, name, targets = [] } = src;

    // reports 不从 sources 发布（需 html 文件）
    const realTargets = targets.filter(t => t !== 'reports');
    if (realTargets.length === 0) {
      results.push({
        source: (name || '(unknown)') + '.md',
        targets: ['reports'],
        success: false,
        output: '\u26a0\ufe0f 类型不匹配：Reports 栏目需使用 .html 文件，.md 文件无法发布到此栏目'
      });
      hasError = true;
      continue;
    }

    // 将文件内容写入临时文件
    let tmpPath;
    try {
      tmpPath = writeTempFile(content || '', '.md');
    } catch (e) {
      results.push({ source: (name || '(unknown)') + '.md', targets: realTargets, success: false, output: '写临时文件失败: ' + e.message });
      hasError = true;
      continue;
    }

    const args = ['--date', date, '--target', realTargets.join(','), '--source', tmpPath];
    if (name) args.push('--name', name);
    if (build) args.push('--build');
    if (push) args.push('--push');
    if (dryRun) args.push('--dry-run');

    runScript(args, (name || '(unknown)') + '.md', realTargets, results, hasError, tmpPath);
  }

  // 处理 htmls（.html 文件内容，发布到 reports 或 blog）
  for (const h of (htmls || [])) {
    const { content, name, targets: hTargets = [] } = h;

    // 只接受 reports/blog 作为 html 发布目标
    const validTargets = hTargets.filter(t => t === 'reports' || t === 'blog');
    if (validTargets.length === 0) {
      results.push({
        source: (name || '(unknown)') + '.html',
        targets: hTargets,
        success: false,
        output: '\u26a0\ufe0f 类型不匹配：Daily 栏目需使用 .md 文件，.html 文件无法发布到此栏目'
      });
      hasError = true;
      continue;
    }

    // 将 HTML 内容写入临时文件
    let tmpPath;
    try {
      tmpPath = writeTempFile(content || '', '.html');
    } catch (e) {
      results.push({ source: (name || '(unknown)') + '.html', targets: validTargets, success: false, output: '写临时文件失败: ' + e.message });
      hasError = true;
      continue;
    }

    const args = ['--date', date, '--target', validTargets.join(','), '--html', tmpPath];
    if (name) args.push('--name', name);
    if (build) args.push('--build');
    if (push) args.push('--push');
    if (dryRun) args.push('--dry-run');

    runScript(args, (name || '(unknown)') + '.html', validTargets, results, hasError, tmpPath);
  }

  if (results.length === 0) {
    return { success: false, output: 'No files to publish. Add at least one file to a column.' };
  }

  var summary = results.map(function(r) {
    var status = r.success ? '[OK]' : '[FAIL]';
    return status + ' [' + r.targets.join(',') + '] ' + r.source + '\n' + r.output;
  }).join('\n\n---\n\n');

  var allSuccess = results.every(function(r) { return r.success; });
  return { success: allSuccess, output: summary };
}

// 写入临时文件，返回路径
function writeTempFile(content, ext) {
  var tmpDir = os.tmpdir();
  var tmpPath = path.join(tmpDir, 'kyzz-publish-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  fs.writeFileSync(tmpPath, content, 'utf8');
  return tmpPath;
}

function runScript(args, src, targets, results, hasErrorRef, tmpPath) {
  var scriptPath = path.join(ROOT, 'scripts/publish.js');
  var cmd = 'node "' + scriptPath + '" ' + args.map(function(a) {
    return '"' + String(a).replace(/"/g, '\\"') + '"';
  }).join(' ');

  // 清理环境变量，过滤非 ASCII 变量名（Windows shell 无法处理）
  var cleanEnv = Object.assign({}, process.env);
  Object.keys(cleanEnv).forEach(function(k) {
    if (/[^A-Za-z0-9_]/.test(k)) delete cleanEnv[k];
  });

  try {
    var output = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 180000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv
    });
    results.push({ source: src, targets: targets, success: true, output: output.trim() });
  } catch (e) {
    // 检查 stdout/stderr 是否包含 Build success（npm build 可能因 stderr 警告导致非 0 exit）
    var stdout = (e.stdout ? e.stdout.toString() : '') + '\n' + (e.stderr ? e.stderr.toString() : '');
    if (/Build success|build Complete|Dry-run done/i.test(stdout)) {
      results.push({ source: src, targets: targets, success: true, output: stdout.trim() });
    } else {
      results.push({ source: src, targets: targets, success: false, output: stdout.trim() });
    }
  } finally {
    // 清理临时文件
    try { if (tmpPath && fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
  }
}

var server = http.createServer(function(req, res) {
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

  var body = '';
  req.on('data', function(chunk) { body += chunk; });
  req.on('end', function() {
    try {
      var data = JSON.parse(body);
      var result = handlePublish(data);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, output: 'Invalid JSON: ' + e.message }));
    }
  });
});

server.listen(PORT, function() {
  console.log('Publish API running at http://localhost:' + PORT + '/api/publish');
});
