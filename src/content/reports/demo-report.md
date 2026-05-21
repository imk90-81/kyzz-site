---
title: '示例报告'
description: '这是一个示例可视化报告，展示 HTML 嵌入功能'
pubDate: 2026-05-21
tags: ['示例', '测试']
---

<iframe
  id="report-iframe"
  src="/reports/demo.html"
  class="w-full border-0 rounded-lg"
  title="示例报告"
  scrolling="no"
></iframe>

<script>
  function resizeIframe() {
    const iframe = document.getElementById('report-iframe');
    if (iframe) {
      iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
    }
  }

  // iframe load event
  const iframe = document.getElementById('report-iframe');
  if (iframe) {
    iframe.addEventListener('load', resizeIframe);
    // also handle window resize
    window.addEventListener('resize', resizeIframe);
  }
</script>

<style is:global>
  #report-iframe {
    width: 100%;
    border: none;
    border-radius: 0.5rem;
    background: #1a1a2e;
  }
</style>