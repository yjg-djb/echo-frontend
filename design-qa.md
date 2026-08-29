# 确认结果页 Design QA

## 对比基准

- source visual truth path: `/Users/lyh/.codex/generated_images/01a04dde-a283-7c62-9a59-7d9ccc81392e/exec-bf71054f-8547-4d8e-a0e1-35ad4369d33a.png`
- implementation screenshot path: `/Users/lyh/Workspace/repos/github/personal/echo-frontend/qa/confirmed-flat-393x852.png`
- combined comparison path: `/Users/lyh/Workspace/repos/github/personal/echo-frontend/qa/confirmed-comparison-v2.png`
- viewport: `393 × 852` CSS px；另检查 `430 × 932`
- source pixels: `1166 × 1349`
- implementation pixels: `393 × 852`
- density normalization: 实现截图像素与 CSS 视口一致，按 DPR 1 检查；源方案是宽幅概念稿而非固定手机画幅，对比图将两者等高缩放到 852px，重点比较内容层级、主视觉语言和相对间距，不对不同宽高比做伪像素级结论。
- state: 讲述者确认记忆后的成功结果页

## 可见对比证据

- full-view comparison: `qa/confirmed-comparison-v2.png` 同时展示源方案和 `393 × 852` 实现。确认标记、标题、旧照与波形、三个归档节点和底部主操作的层级一致。
- focused region comparison: 未另做局部裁切；组合图原始高度下标题、正文、节点图标与按钮文案均清晰可读，足以检查本次单屏改造。

## 五项必检

- 字体与排版：沿用项目现有系统中文字体；标题保持两行、节点文字保持单行，字号和行高在 393px 与 430px 宽度下均无截断。
- 间距与布局：移除磁带、倾斜纸片、厚阴影和独立卡片；波形落点与三个节点保持同轴，底部操作区完整可见。两个验收视口均无滚动溢出。
- 色彩与令牌：沿用项目 `--canvas`、`--ink`、`--accent`；橙色只用于确认标记、波形、节点和主按钮。
- 图片质量与素材：使用真实 `wenrufang-1978.webp` 派生的专用显影素材，人物和建筑未被占位图或 CSS 绘图替代；网页素材为 `1200 × 800` JPEG。
- 文案与内容：保留“已收入记忆馆”的确认结果；将“房间里多了一盘磁带”改为与新表达一致的“记忆馆新增一段原声”。

## 对比迭代记录

### 第一次对比

- [P2] 主视觉偏小、三个结果节点位置偏高，导致列表与底部操作之间留白过大。
- [P2] 结果正文相较源方案偏小，长辈阅读感不足。

修复：主视觉宽度由 100% 调整为 116%，保持波形落点居中；列表整体下移并补齐连接线；说明文字由 12px 调整为 13px，结果文字由 12px 调整为 13px。

### 第二次对比

- `qa/confirmed-comparison-v2.png` 显示主视觉占比、列表位置和字体层级已接近源方案，在手机窄画幅中保持完整 CTA。
- 无剩余 P0、P1、P2 问题。

## 行为与浏览器检查

- 已测试：打开长辈邀请 → 开始采访 → 生成整理稿 → 确认收入记忆馆 → 去家馆看看。
- 主按钮成功进入 `s-home`。
- 浏览器 console error/warn：0。
- `393 × 852`：`clientHeight = 852`，`scrollHeight = 852`，无溢出。

## 后续微调

- [P3] 源概念稿底色略暖；当前实现保留项目原有浅灰画布，以维持全站一致性。

final result: passed
