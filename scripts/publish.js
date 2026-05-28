#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// --- 参数解析 ---
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--date') opts.date = args[++i];
    else if (a === '--target') opts.target = args[++i];
    else if (a === '--source') opts.source = args[++i];
    else if (a === '--html') opts.html = args[++i];
    else if (a === '--build') opts.build = true;
    else if (a === '--push') opts.push = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

function showHelp() {
  console.log(`
kyzz-publish - 发布内容到 kyzz-site

用法:
  node scripts/publish.js --date YYYY-MM-DD --target <栏目> --source <文件>

必填参数:
  --date <YYYY-MM-DD>     发布日期
  --target <栏目>          daily, reports, blog, all（逗号分隔）
  --source <文件路径>       源 markdown 文件路径

可选参数:
  --html <文件路径>        wechat HTML 文件路径（reports 需要）
  --build                  生成后自动 npm run build
  --push                   构建后自动 git commit + push
  --dry-run                预览，不实际写入
  -h, --help               帮助
`);
}

// --- 工具函数 ---
function readFile(p) {
  if (!fs.existsSync(p)) throw new Error('文件不存在: ' + p);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  console.log('  OK ' + path.relative(ROOT, p));
}

function ensureHtmlStructure(html) {
  if (/<html[\s>]/i.test(html)) return html;
  let head = '';
  let body = html;
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (headMatch) {
    head = headMatch[1];
    body = html.replace(/<head>[\s\S]*?<\/head>/i, '').trim();
  }
  const bodyMatch = body.match(/<body>([\s\S]*?)<\/body>/i);
  let bodyContent = bodyMatch ? bodyMatch[1] : body;
  if (!bodyMatch && !/^<body/i.test(body)) {
    bodyContent = body;
  }
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' + head + '\n</head>\n<body>\n' + bodyContent + '\n</body>\n</html>';
}

function extractFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { fm: {}, body: md };
  const fm = {};
  m[1].split('\n').forEach(function(line) {
    const idx = line.indexOf(':');
    if (idx > 0) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return { fm: fm, body: md.slice(m[0].length).trim() };
}

// 生成 daily MD（frontmatter 符合 daily schema）
function generateDailyMd(sourceMd, date) {
  const parsed = extractFrontmatter(sourceMd);
  const title = parsed.fm.title || '日报 — ' + date.replace(/-/g, '.');
  const description = parsed.fm.description || '日报 ' + date;
  return '---\ntitle: "' + title + '"\ndescription: "' + description + '"\npubDate: ' + date + '\ntags: [daily]\n---\n\n' + parsed.body;
}

// 生成 reports MD（frontmatter 符合 reports schema）
function generateReportsMd(date, title, description) {
  title = title || '报告 ' + date;
  description = description || '报告 ' + date;
  return '---\ntitle: "' + title + '"\ndescription: "' + description + '"\npubDate: ' + date + '\ntags: [report]\n---\n\nimport Layout from \'../../layouts/ReportsLayout.astro\';\n\n<Layout title="' + title + '">\n  <div class="iframe-container">\n    <iframe \n      src={`/reports/ai-coding-daily-' + date + '.html`}\n      title="' + title + '"\n      className="report-iframe"\n      style={{ width: \'100%\', height: \'100%\', border: \'none\' }}\n    />\n  </div>\n</Layout>\n';
}

// 生成 blog MD（frontmatter 符合 blog schema）
function generateBlogMd(sourceMd, date) {
  const parsed = extractFrontmatter(sourceMd);
  const title = parsed.fm.title || 'Blog — ' + date.replace(/-/g, '.');
  const description = parsed.fm.description || 'Blog ' + date;
  return '---\ntitle: "' + title + '"\ndescription: "' + description + '"\npubDate: ' + date + '\ntags: [blog]\n---\n\n' + parsed.body;
}

// --- 主逻辑 ---
function main() {
  const opts = parseArgs();
  if (opts.help) { showHelp(); return; }

  const errors = [];
  if (!opts.date) errors.push('--date 必填');
  if (!opts.target) errors.push('--target 必填');
  if (!opts.source) errors.push('--source 必填');
  if (errors.length) {
    errors.forEach(function(e) { console.error('ERROR: ' + e); });
    showHelp();
    process.exit(1);
  }

  const date = opts.date;
  const targets = opts.target === 'all' ? ['daily', 'reports', 'blog'] : opts.target.split(',').map(function(t) { return t.trim(); });
  const sourcePath = path.resolve(opts.source);

  console.log('\nkyzz-publish');
  console.log('  date: ' + date);
  console.log('  targets: ' + targets.join(', '));
  console.log('  source: ' + opts.source + '\n');

  let sourceMd;
  try { sourceMd = readFile(sourcePath); }
  catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }

  let htmlContent = null;
  if (opts.html) {
    try {
      htmlContent = readFile(path.resolve(opts.html));
      htmlContent = ensureHtmlStructure(htmlContent);
      console.log('  OK HTML loaded');
    } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
  }

  if (targets.includes('reports') && !htmlContent) {
    console.warn('  WARN: target includes reports but no --html, skipping HTML file');
  }

  // 从源文件提取 title/description 传给 reports
  const parsed = extractFrontmatter(sourceMd);
  const srcTitle = parsed.fm.title;
  const srcDesc = parsed.fm.description;

  const files = [];

  targets.forEach(function(t) {
    if (t === 'daily') {
      files.push({
        path: path.join(ROOT, 'src/content/daily', 'AI_Coding_Daily_' + date + '.md'),
        content: generateDailyMd(sourceMd, date),
        label: 'daily'
      });
    } else if (t === 'reports') {
      if (htmlContent) {
        files.push({
          path: path.join(ROOT, 'public/reports', 'ai-coding-daily-' + date + '.html'),
          content: htmlContent,
          label: 'reports-html'
        });
      }
      files.push({
        path: path.join(ROOT, 'src/content/reports', 'ai-coding-daily-' + date + '.md'),
        content: generateReportsMd(date, srcTitle, srcDesc),
        label: 'reports-md'
      });
    } else if (t === 'blog') {
      files.push({
        path: path.join(ROOT, 'src/content/blog', 'ai-coding-daily-' + date + '.md'),
        content: generateBlogMd(sourceMd, date),
        label: 'blog'
      });
    } else {
      console.warn('  WARN: unknown target: ' + t);
    }
  });

  if (opts.dryRun) {
    console.log('\n[Dry-run] ' + files.length + ' files:\n');
    files.forEach(function(f) { console.log('  ' + path.relative(ROOT, f.path) + '  [' + f.label + ']'); });
    console.log('\nDry-run done.\n');
    return;
  }

  console.log('\nWriting ' + files.length + ' files:\n');
  files.forEach(function(f) { writeFile(f.path, f.content); });

  const commitMsg = 'feat: add content ' + date + ' (' + targets.join(', ') + ')';
  console.log('\nFiles written. commit: ' + commitMsg + '\n');

  if (opts.build) {
    console.log('Building...\n');
    try {
      execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
      console.log('\nBuild success.\n');
    } catch (e) {
      console.error('\nBuild failed.');
      process.exit(1);
    }
  }

  if (opts.push) {
    console.log('Committing and pushing...\n');
    try {
      execSync('git add -A && git commit -m "' + commitMsg + '" && git push origin master', {
        cwd: ROOT, stdio: 'inherit'
      });
      console.log('\nPush success.\n');
    } catch (e) {
      console.error('\nPush failed.');
      process.exit(1);
    }
  }

  if (!opts.build && !opts.push) {
    console.log('Hint: add --build and --push to auto build and push.\n');
  }
}

main();
