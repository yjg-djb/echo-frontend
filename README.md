# echo-frontend · 时光回响（线上版）

「时光回响」家庭 AI 语音采访 H5 的**线上发布仓库**：浅色 soft-UI 路演版（roadshow-soft-h5）。
15 屏全流程 + 真实 mock 素材（16 段采访原声 / 14 段记忆长廊 / 15 张城市照片墙 / 360° 全景家馆）。

- 本地开发目录：`D:\人生之书oadshow-soft-h5`（原深色全景版保留在 `roadshow-h5`）
- 部署：Docker（nginx:1.27-alpine），宿主 8080 → 容器 80，健康检查 `/healthz`
- 服务器更新：`bash scripts/deploy-server.sh`（端口检查 + 旧镜像回滚 + 冒烟验证）
- 校验：`powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/verify.ps1`

历史：v1 为 3D 心树院落单页 → v2 为写实 360° 全景版（见 git 历史）→ **v3（当前）浅色 soft-UI 路演版**。
