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
    else if (a === '--name') opts.name = args[++i];
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
  --name <名称>            文件名前缀，默认 ai-coding-daily（如：a-gu-chenjian）
  --build                  生成后自动 npm run build
  --push                   构建后自动 git commit + push
  --dry-run                预览，不实际写入
  -h, --help               帮助
`);
}

// --- 工具函数 ---

// 将任意字符串转为 kebab-case 文件名（中文拼音化 + 去特殊字符）
// 简单实现：只保留英文、数字、连字符、下划线、汉字，其余替换为 -
function toKebab(str) {
  return str
    .toLowerCase()
    .replace(/[\s_]+/g, '-')           // 空格/下划线 → 连字符
    .replace(/[^a-z0-9\-\u4e00-\u9fff]/g, '')  // 只保留英文数字连字符中文
    .replace(/^-+|-+$/g, '');          // 去首尾连字符
}

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error('文件不存在: ' + p);
  const buf = fs.readFileSync(p);
  // 尝试 UTF-8 解码，若含大量替换字符则尝试 GB18030
  const utf8Str = buf.toString('utf8');
  // 统计替换字符比例，超过 5% 认为是非 UTF-8
  const total = utf8Str.length;
  const bad = (utf8Str.match(/\ufffd/g) || []).length;
  if (total > 0 && bad / total > 0.05) {
    // 尝试 GB18030（Node 18+ 内置支持）
    try {
      const gbkStr = new TextDecoder('gb18030', { fatal: true }).decode(buf);
      console.log('  检测到非 UTF-8 编码，已自动转换为 UTF-8');
      return gbkStr;
    } catch (e) {
      // GB18030 也失败，退回原始 UTF-8
    }
  }
  return utf8Str;
}

function writeFile(p, content) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // 强制 UTF-8 写入
  fs.writeFileSync(p, content, { encoding: 'utf8' });
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
function generateReportsMd(date, name, title, description) {
  const t = title || '报告 ' + date;
  const d = description || '报告 ' + date;
  const safeName = name || 'ai-coding-daily';
  return '---\ntitle: "' + t + '"\ndescription: "' + d + '"\npubDate: ' + date + '\ntags: [report]\n---\n\nimport Layout from \'../../layouts/ReportsLayout.astro\';\n\n<Layout title="' + t + '">\n  <div class="iframe-container">\n    <iframe \n      src={`/reports/' + safeName + '-' + date + '.html`}\n      title="' + t + '"\n      className="report-iframe"\n      style={{ width: \'100%\', height: \'100%\', border: \'none\' }}\n    />\n  </div>\n</Layout>\n';
}

// 生成 blog MD（嵌入 HTML iframe，Astro 原样渲染 body）
function generateBlogHtmlMd(date, name, htmlTitle, htmlDesc) {
  const t = htmlTitle || 'Blog ' + date;
  const d = htmlDesc || 'Blog ' + date;
  const safeName = name || 'ai-coding-daily';
  return '---\ntitle: "' + t + '"\ndescription: "' + d + '"\npubDate: ' + date + '\ntags: [blog]\n---\n\n<iframe src="/blog/' + safeName + '-' + date + '.html" style="width:100%;border:none;min-height:800px;background:#1a1a2e" onload="this.style.height=this.contentDocument.body.scrollHeight+\'px\'"></iframe>\n';
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
  // source 非必填：当 target 包含 reports/blog 且有 html 时，可以只传 --html
  if (!opts.source && !opts.html) errors.push('--source 或 --html 至少传一个');
  if (errors.length) {
    errors.forEach(function(e) { console.error('ERROR: ' + e); });
    showHelp();
    process.exit(1);
  }

  const date = opts.date;
  const targets = opts.target === 'all' ? ['daily', 'reports', 'blog'] : opts.target.split(',').map(function(t) { return t.trim(); });

  console.log('\nkyzz-publish');
  console.log('  date: ' + date);
  console.log('  targets: ' + targets.join(', '));
  console.log('  source: ' + (opts.source || '(none)'));
  console.log('  html: ' + (opts.html || '(none)') + '\n');

  // daily 需要 source（md）
  if (targets.includes('daily') && !opts.source) {
    console.error('ERROR: daily 栏目需要 --source（.md 文件）');
    process.exit(1);
  }

  let sourceMd = null;
  if (opts.source) {
    try { sourceMd = readFile(path.resolve(opts.source)); }
    catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
  }

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

  // 从源文件或 HTML 提取 title/description
  let srcTitle, srcDesc;
  if (sourceMd) {
    const parsed = extractFrontmatter(sourceMd);
    srcTitle = parsed.fm.title;
    srcDesc = parsed.fm.description;
  } else if (htmlContent) {
    const titleMatch = htmlContent.match(/<title>([\s\S]*?)<\/title>/i);
    srcTitle = titleMatch ? titleMatch[1].trim() : null;
    srcDesc = null;
  }
  // 文件名前缀：默认 ai-coding-daily，可通过 --name 覆盖
  const nameSlug = opts.name ? toKebab(opts.name) : 'ai-coding-daily';

  const files = [];

  targets.forEach(function(t) {
    if (t === 'daily') {
      files.push({
        path: path.join(ROOT, 'src', 'content', 'daily', 'AI_Coding_Daily_' + date + '.md'),
        content: generateDailyMd(sourceMd, date),
        label: 'daily'
      });
    } else if (t === 'reports') {
      if (htmlContent) {
        files.push({
          path: path.join(ROOT, 'public', 'reports', nameSlug + '-' + date + '.html'),
          content: htmlContent,
          label: 'reports-html'
        });
      }
      files.push({
        path: path.join(ROOT, 'src', 'content', 'reports', nameSlug + '-' + date + '.md'),
        content: generateReportsMd(date, nameSlug, srcTitle, srcDesc),
        label: 'reports-md'
      });
    } else if (t === 'blog') {
      if (htmlContent) {
        // html 文件嵌入 blog（HTML 放 public/blog/，MD 用 BlogLayout iframe）
        const htmlTitle = htmlContent.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || srcTitle || 'Blog ' + date;
        const htmlDesc = srcDesc || 'Blog ' + date;
        files.push({
          path: path.join(ROOT, 'public', 'blog', nameSlug + '-' + date + '.html'),
          content: htmlContent,
          label: 'blog-html'
        });
        files.push({
          path: path.join(ROOT, 'src', 'content', 'blog', nameSlug + '-' + date + '.md'),
          content: generateBlogHtmlMd(date, nameSlug, htmlTitle, htmlDesc),
          label: 'blog-md'
        });
      } else {
        // md 文件直接作为 blog 内容
        files.push({
          path: path.join(ROOT, 'src', 'content', 'blog', nameSlug + '-' + date + '.md'),
          content: generateBlogMd(sourceMd, date),
          label: 'blog'
        });
      }
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

  // 构建干净的 env，过滤掉 Windows 上有问题的环境变量（含 Unicode/特殊字符导致 shell 报错）
  function cleanEnv() {
    const env = Object.assign({}, process.env);
    // 删除包含非 ASCII 字符或特殊冒号的变量名（Windows shell 无法处理）
    Object.keys(env).forEach(function(k) {
      if (/[^A-Za-z0-9_]/.test(k)) delete env[k];
    });
    return env;
  }

  if (opts.build) {
    console.log('Building...\n');
    try {
      // 用 npx 直接调用，绕过 QClaw npm wrapper 的 CreateCleanEnv 问题
      var astroBin = path.join(ROOT, 'node_modules', '.bin', 'astro');
      var pagefindBin = path.join(ROOT, 'node_modules', '.bin', 'pagefind');
      execSync('"' + astroBin + '" build && "' + pagefindBin + '" --site public', {
        cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], env: cleanEnv(), shell: true
      });
      console.log('\nBuild success.\n');
    } catch (e) {
      // Pagefind 的 stderr 警告（stemming）不影响构建，检查是否实际完成
      var stdout = (e.stdout || '').toString();
      var stderr = (e.stderr || '').toString();
      if (/build Complete|Indexed \d+ pages|Finished in/.test(stdout + stderr)) {
        console.log('\nBuild success (with warnings).\n');
      } else {
        console.error('\nBuild failed.');
        console.error(stdout.slice(-1000));
        process.exit(1);
      }
    }
  }

  if (opts.push) {
    console.log('Committing and pushing...\n');
    try {
      execSync('git add -A && git commit -m "' + commitMsg + '" && git push origin master', {
        cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'], env: cleanEnv()
      });
      console.log('\nPush success.\n');
    } catch (e) {
      console.error('\nPush failed.');
      var stdout2 = e.stdout ? e.stdout.toString() : '';
      var stderr2 = e.stderr ? e.stderr.toString() : '';
      if (stdout2) console.error(stdout2);
      if (stderr2) console.error(stderr2);
      process.exit(1);
    }
  }

  if (!opts.build && !opts.push) {
    console.log('Hint: add --build and --push to auto build and push.\n');
  }
}

main();
