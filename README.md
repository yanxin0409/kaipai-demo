# 开拍 · AI 视频体验版

填一句提示词，MiniMax H3 模型即刻生成 AI 视频。免费体验，算力由 AutoDL.Art 平台提供。

## 快速开始

1. 在 令牌管理（autodl.art/large-model/tokens）创建一个 **ComfyUI 分组** 的 token
2. 启动应用，把 token 粘贴进输入框
3. 填一句提示词，选择时长/分辨率，点「生成视频」

## 计费

出片费用按次计（480p 约 ¥0.2/次），从你自己的账号扣，本应用零垫资。

## 运行

零依赖，Python 标准库即可：

```bash
python3 server.py   # 监听 8080 端口（AUTO_PORT 可覆盖）
```

前端页面由本服务托管，浏览器打开 http://127.0.0.1:8080 即可。

## 升级专业版

体验版走平台标准 H3 通道。需要 1080P 高清 / 15秒+ 长视频 / 数字人直播 / AI 导演分镜 / 自有 API 计费体系，请访问专业版：kaipai.gzhongde.cn
