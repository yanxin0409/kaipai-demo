// ============================================================================
// 开拍 · AutoDL.Art 体验版（引流版）后端
//
// 定位：极简、零依赖、自包含。调 AutoDL.Art 平台的 ComfyUI H3 API 出片。
// 用户用自己的 ComfyUI token，费用扣在用户账号，本应用零垫资。
//
// 跑法：node server.js   （监听 8080，AUTO_PORT 可覆盖）
// ============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = parseInt(process.env.AUTO_PORT || '8080', 10);
const API_BASE = process.env.AUTODL_ART_API || 'https://autodl.art/api/v1';
const STATIC_DIR = __dirname; // 全平铺结构：index.html 与 server.js 同目录

// 体验版支持的平台工作流（uuid -> 中文名）。这些是平台公开的 H3 工作流。
const WORKFLOWS = [
  { id: 'minimax_h3_lightx2v_no_pic', name: 'H3 文生视频', desc: '文字描述直接生成视频' },
  { id: 'minimax_h3_zm_u08', name: 'H3 多图多音频生视频（高速版）', desc: '多图参考 + 音频对口型' },
  { id: 'minimax_h3_b99_001', name: 'H3 文生视频（基础版）', desc: '文生视频基础工作流' },
];

// ---------------------------------------------------------------------------
// 工具：发 HTTP 请求（Node 原生，无依赖）
// ---------------------------------------------------------------------------
function request(method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// 工具：读请求体
// ---------------------------------------------------------------------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// 路由
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const reqPath = url.pathname;

  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  // 健康检查
  if (reqPath === '/api/health') {
    return json(res, 200, { ok: true, app: 'kaipai-demo', time: new Date().toISOString() });
  }

  // 支持的工作流列表
  if (reqPath === '/api/workflows') {
    return json(res, 200, { workflows: WORKFLOWS });
  }

  // 提交出片任务
  if (reqPath === '/api/generate' && req.method === 'POST') {
    const body = await readBody(req);
    const token = body.token;
    const workflowId = body.workflow_id || 'minimax_h3_lightx2v_no_pic';
    const prompt = (body.prompt || '').trim();
    const duration = Math.min(Math.max(parseInt(body.duration || '5', 10), 1), 15);
    const resolution = body.resolution || '480p竖';

    if (!token) return json(res, 400, { error: '请先填写你的 ComfyUI token' });
    if (!prompt) return json(res, 400, { error: '请填写视频提示词' });

    try {
      const r = await request('POST', `${API_BASE}/comfyui/comfyui_workflow/${workflowId}`, {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, duration, resolution }),
      });
      if (r.data && r.data.code === 'Success' && r.data.data) {
        return json(res, 200, { task_id: r.data.data.task_id, status: r.data.data.status });
      }
      return json(res, r.status, { error: (r.data && r.data.msg) || '提交任务失败' });
    } catch (e) {
      return json(res, 500, { error: '请求平台失败：' + e.message });
    }
  }

  // 查询任务结果
  if (reqPath === '/api/result' && req.method === 'GET') {
    const token = url.searchParams.get('token');
    const taskId = url.searchParams.get('task_id');
    if (!token || !taskId) return json(res, 400, { error: '缺少 token 或 task_id' });

    try {
      const r = await request('GET', `${API_BASE}/comfyui/comfyui_workflow/result/${taskId}`, {
        headers: { Authorization: token },
      });
      if (r.data && r.data.data) {
        const d = r.data.data;
        return json(res, 200, {
          status: d.status,
          duration: d.duration,
          cost: d.cost,
          results: d.results || [],
          message: r.data.msg,
        });
      }
      return json(res, r.status, { error: (r.data && r.data.msg) || '查询失败' });
    } catch (e) {
      return json(res, 500, { error: '查询失败：' + e.message });
    }
  }

  // 静态文件（托管前端）
  if (req.method === 'GET') {
    let filePath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\//, '');
    filePath = path.join(STATIC_DIR, filePath);
    // 防目录穿越
    if (!filePath.startsWith(STATIC_DIR)) {
      return json(res, 403, { error: 'forbidden' });
    }
    fs.readFile(filePath, (err, data) => {
      if (err) return json(res, 404, { error: 'not found' });
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
    return;
  }

  // 其余路径 → 404
  json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`开拍体验版已启动：http://127.0.0.1:${PORT}`);
  console.log(`支持工作流 ${WORKFLOWS.length} 个（H3 文生/图生/多图音频）`);
});
