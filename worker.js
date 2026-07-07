export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API: 访问统计
    if (url.pathname === '/api/stats') {
      const today = new Date().toISOString().slice(0, 10);
      const todayKey = `pv:${today}`;
      const totalKey = 'pv:total';

      let total = 0;
      let todayCount = 0;

      try {
        const kv = env.KYZZ_KV;
        if (!kv) throw new Error('KV not bound');

        todayCount = await kv.get(todayKey);
        todayCount = todayCount ? parseInt(todayCount, 10) + 1 : 1;
        await kv.put(todayKey, todayCount.toString(), { expirationTtl: 86400 * 2 });

        total = await kv.get(totalKey);
        total = total ? parseInt(total, 10) + 1 : 1;
        await kv.put(totalKey, total.toString());
      } catch (e) {
        total = -1;
        todayCount = -1;
      }

      return new Response(JSON.stringify({ total, today: todayCount }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    }

    // 其余请求走静态资源
    return env.ASSETS.fetch(request);
  },
};
