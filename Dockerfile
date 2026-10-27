# 纯 CPU 极简镜像，用于 AutoDL.Art 上架
FROM node:22-alpine

WORKDIR /app

# 零 npm 依赖，只拷代码
COPY server.js ./
COPY index.html ./
COPY README.md ./

# 应用监听 8080（AutoDL 自定义服务端口映射到公网）
ENV AUTO_PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
