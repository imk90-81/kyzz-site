export async function onRequest(context) {
  const { request, env } = context;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

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
    total = total ? parseInt(total, 10) + 1 : total;
    await kv.put(totalKey, total.toString());
  } catch (e) {
    total = -1;
    todayCount = -1;
  }

  // 避免同一次页面加载被重复计数：检查 referer
  return new Response(JSON.stringify({ total, today: todayCount }), { headers });
}
