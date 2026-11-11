# 验证记录

验证日期：2026 年 11 月 10 日。

## 已通过

- 所需 npm 依赖已安装，交付 `package-lock.json`。
- 应用 SVG、192 / 512 PNG、Apple touch icon 与遮罩图标生成成功。
- `npm test`：**3 个测试文件、26 项测试全部通过**。
- `npm run build`：TypeScript 检查、Vite 生产构建与 PWA Service Worker 生成成功。
- 使用 `/what-to-cook/` base 构建成功，检查了 manifest 的 `id / start_url / scope`、HTML 中引用的资源文件、图标和 Service Worker 的子路径离线回退。
- 本地生产预览返回 HTTP 200。

## 自动测试的范围

`tests/recipes.test.ts` 验证结构化 Recipe、`@graph`、步骤分组、ISO 总用时、保守解析、危险链接拒绝、受限链接处理，以及食材数量和单位合并。

`tests/db.test.ts` 使用真实 Dexie 代码和 fake-indexeddb 验证首次初始化、重复初始化、已有数据保护、清空后不重新加入示例、关闭重开、备份导出恢复、重复 ID 不覆盖、已有清单保留、无效备份拒绝。

`tests/ui.test.tsx` 在 JSDOM 中渲染真实 React 页面，并通过实际按钮、输入和 IndexedDB 验证：首页换菜 / 筛选，搜索 / 收藏，添加 / 编辑 / 删除，编辑器笔记与详情同步，小红书回退与原文草稿，选择菜谱、合并和勾选清单。

组件测试仅对 PWA 注册钩子使用模拟值。**它们不能代替真实浏览器的样式、Service Worker 或离线验证。**

## 尚未完成的浏览器与真机检查

当前执行环境的浏览器预览连接超时；系统 Chrome 和独立 Chromium 启动时也受到 macOS 进程权限限制，错误为 `bootstrap_check_in … Permission denied (1100)`。因此本次不能提供通过的视觉截图、浏览器离线运行结果或 iPhone 真机安装验证。

这属于测试环境阻碍；不能据此声称浏览器场景已通过。生产缓存文件和配置已经生成并检查，仍应按 README 的步骤在正式 HTTPS 网址及 iPhone 上验证。

## 如何运行附带的浏览器测试

项目包含 `e2e/app.spec.ts`：6 个场景分别在桌面尺寸和 iPhone 13 尺寸运行，共 12 个浏览器测试。

```bash
npm install
npx playwright install chromium
npm run build
npm run test:e2e
```

测试会自行启动 4173 端口的生产预览；已有同端口预览时会复用。如果其他应用占用此端口，请先停止它。macOS 上如存在系统 Chrome，默认使用它；也可用 `PLAYWRIGHT_CHROME` 指定测试浏览器的可执行文件。

覆盖首页随机 / 筛选 / 无横向溢出、照片上传 / 菜谱 CRUD / 笔记 / 收藏 / 搜索、受限链接导入、买菜合并 / 勾选 / 刷新、JSON 导出 / 恢复、Service Worker 就绪后断网刷新与离线保存笔记。

浏览器尺寸测试使用 Chromium 模拟 iPhone 视口与触摸行为，**不代表 iOS Safari 真机测试**。首页截图在测试成功后输出到 `test-results/`；该目录不提交到 GitHub。

## 发布前建议在自己的手机上检查

1. Safari 打开 GitHub Pages 的 HTTPS 地址，确认样式、图片、底部导航正常。
2. 添加到主屏幕后打开，等待离线资源就绪。
3. 添加一份自己的菜谱并上传照片，关闭重开，确认内容仍在。
4. 添加两道菜到清单，勾选一项，重开检查状态。
5. 开启飞行模式，重开已安装应用，查看菜谱、照片与清单，编辑并保存笔记。
6. 联网后导出 JSON，用导入预览确认可读取；重复恢复应跳过已有菜谱。
7. 更换入口、网址或设备前先导出备份。
