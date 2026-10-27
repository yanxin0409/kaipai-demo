# ============================================================================
# 开拍 · AutoDL.Art 体验版（引流版）后端 · Python 版
#
# 定位：极简、零依赖（纯标准库）。调 AutoDL.Art 平台的 ComfyUI H3 API 出片。
# 用户用自己的 ComfyUI token，费用扣在用户账号，本应用零垫资。
#
# 跑法：python3 server.py   （监听 8080，AUTO_PORT 可覆盖）
# ============================================================================

import http.server
import json
import os
import urllib.request
import urllib.error

PORT = int(os.environ.get('AUTO_PORT', '8080'))
API_BASE = os.environ.get('AUTODL_ART_API', 'https://autodl.art/api/v1')

# 体验版支持的平台工作流
WORKFLOWS = [
    {'id': 'minimax_h3_lightx2v_no_pic', 'name': 'H3 文生视频', 'desc': '文字描述直接生成视频'},
    {'id': 'minimax_h3_zm_u08', 'name': 'H3 多图多音频生视频（高速版）', 'desc': '多图参考 + 音频对口型'},
    {'id': 'minimax_h3_b99_001', 'name': 'H3 文生视频（基础版）', 'desc': '文生视频基础工作流'},
]


def api_request(method, url, token=None, payload=None):
    """调平台 API"""
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = token
    data = json.dumps(payload).encode() if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {'msg': str(e)}
    except Exception as e:
        return 500, {'msg': str(e)}


class Handler(http.server.BaseHTTPRequestHandler):

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', len(body))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()
        self.wfile.write(body)

    def _static(self, path):
        if path == '/':
            path = '/index.html'
        # 防目录穿越
        fp = os.path.normpath(os.path.join(os.path.dirname(__file__), path.lstrip('/')))
        if not fp.startswith(os.path.dirname(os.path.abspath(__file__))):
            return self._json(403, {'error': 'forbidden'})
        if not os.path.isfile(fp):
            return self._json(404, {'error': 'not found'})
        ext = os.path.splitext(fp)[1].lower()
        mime = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
                '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'}.get(ext, 'application/octet-stream')
        with open(fp, 'rb') as f:
            body = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._json(204, {})

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/health':
            return self._json(200, {'ok': True, 'app': 'kaipai-demo'})
        if path == '/api/workflows':
            return self._json(200, {'workflows': WORKFLOWS})
        if path == '/api/result':
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            token = (qs.get('token') or [''])[0]
            task_id = (qs.get('task_id') or [''])[0]
            if not token or not task_id:
                return self._json(400, {'error': '缺少 token 或 task_id'})
            status, data = api_request(
                'GET', f'{API_BASE}/comfyui/comfyui_workflow/result/{task_id}', token=token)
            if isinstance(data, dict) and data.get('data'):
                d = data['data']
                return self._json(200, {
                    'status': d.get('status'), 'duration': d.get('duration'),
                    'cost': d.get('cost'), 'results': d.get('results') or [],
                    'message': data.get('msg')})
            return self._json(status, {'error': (data or {}).get('msg', '查询失败')})
        return self._static(path)

    def do_POST(self):
        path = self.path.split('?')[0]
        if path == '/api/generate':
            length = int(self.headers.get('Content-Length', 0))
            try:
                body = json.loads(self.rfile.read(length) or b'{}')
            except Exception:
                body = {}
            token = body.get('token')
            workflow_id = body.get('workflow_id', 'minimax_h3_lightx2v_no_pic')
            prompt = (body.get('prompt') or '').strip()
            try:
                duration = min(max(int(body.get('duration', 5)), 1), 15)
            except (TypeError, ValueError):
                duration = 5
            resolution = body.get('resolution', '480p竖')
            if not token:
                return self._json(400, {'error': '请先填写你的 ComfyUI token'})
            if not prompt:
                return self._json(400, {'error': '请填写视频提示词'})
            status, data = api_request(
                'POST', f'{API_BASE}/comfyui/comfyui_workflow/{workflow_id}',
                token=token,
                payload={'prompt': prompt, 'duration': duration, 'resolution': resolution})
            if isinstance(data, dict) and data.get('code') == 'Success' and data.get('data'):
                return self._json(200, {'task_id': data['data']['task_id'],
                                        'status': data['data'].get('status')})
            return self._json(status, {'error': (data or {}).get('msg', '提交任务失败')})
        self._json(404, {'error': 'not found'})

    def log_message(self, fmt, *args):
        pass  # 静默访问日志


if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
    print(f'开拍体验版已启动：http://127.0.0.1:{PORT}')
    server.serve_forever()
