# 时光回响 · 写实家馆

独立于根目录原版本的照片级全景网页。保留原有 9 个页面，只替换家馆的 3D 渲染内核。

## 构建

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\build.ps1
```

运行所需的 2048×1024 WebP 已提交。`scripts/prepare-assets.py` 仅用于维护者从本地 `assets/source/` 原始 PNG 重新派生运行资源；原始 PNG 不进入发布仓库。

## 本地打开

```powershell
python -m http.server 8770 --bind 127.0.0.1 --directory .
```

访问 `http://127.0.0.1:8770/`。首次访问会渐进加载六个 360° 场景，之后由 Service Worker 缓存。

## Docker

```powershell
docker compose up -d --build
```

容器监听宿主机 `8080`，健康检查为 `http://127.0.0.1:8080/healthz`。服务器更新脚本位于 `scripts/deploy-server.sh`，会检查端口所有者、保存旧镜像并在冒烟失败时回滚。

已登录服务器后也可以运行一阶段向导：

```bash
curl -fsSL https://raw.githubusercontent.com/yjg-djb/echo-frontend/main/scripts/deploy-wizard.sh | bash
```

## 场景

1. 院落高点
2. 院门入口
3. 心树近景
4. 堂屋门槛
5. 堂屋中央
6. 照片墙前

首次进入会用用户指定的竖版院落图片播放 2.2 秒鸟瞰建立镜头，可跳过。六个坐标之间使用双球面融合、推拉、旋转和门框/暗场遮罩完成电影化转场。

触控时先横向移动进入环视模式，随后可同时调整水平和俯仰；纯纵向手势继续用于在四个观景点之间推进。四向按钮和键盘方向键提供非拖拽替代操作，俯仰范围约为 ±85°。点击“全景总览”可以查看完整 2:1 原始球面图。
