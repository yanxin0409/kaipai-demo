# 开拍 · AI 视频体验版

> 一句话描述：填一句提示词，MiniMax H3 模型即刻生成 AI 视频。免费体验，算力由 AutoDL.Art 平台提供。

## 这是什么

开拍（AI 视频生成）的**体验版**。它调用 AutoDL.Art 平台的 ComfyUI H3 工作流出片，你只需要一个自己的 ComfyUI token，无需任何 GPU 配置、无需部署模型。

## 快速开始

1. 在 [令牌管理](https://autodl.art/large-model/tokens) 创建一个 **ComfyUI 分组** 的 token。
2. 启动本应用，浏览器打开后把 token 粘贴进去。
3. 填一句提示词，选择时长 / 分辨率，点「生成视频」。

## 计费说明

- 出片费用**按次计**（480p 约 ¥0.2 / 次），从**你自己的账号**扣，本应用不垫资、不抽成。
- 平台按分辨率计费：480p 峰值 40 / 768p 峰值 50（单位：厘）。

## 支持的能力

| 工作流 | 说明 |
|---|---|
| H3 文生视频 | 文字描述直接生成视频 |
| H3 文生视频（基础版） | 文生视频基础工作流 |

> 更多平台工作流（图生视频、多图多音频对口型等）可在后端 `server.js` 的 `WORKFLOWS` 数组里扩展。

## 技术说明

- 纯 Node.js 单文件后端，**零 npm 依赖**，纯 CPU 运行（不碰 GPU）。
- 监听 8080 端口（可用 `AUTO_PORT` 覆盖）。
- 前端为单页 HTML，后端同时托管静态文件。

## 升级专业版

体验版走平台标准 H3 通道。如果你需要：

- **1080P 高清出片**
- **15 秒+ 长视频**
- **数字人直播**
- **AI 导演分镜编排**
- **自有 API Key 与积分计费体系**

欢迎访问专业版：[kaipai.gzhongde.cn](https://kaipai.gzhongde.cn)

## 本地运行

```bash
node server.js
# 打开 http://127.0.0.1:8080
```

## Docker

```bash
docker build -t kaipai-demo .
docker run -p 8080:8080 kaipai-demo
```
