# 今天吃什么 🍲

一款手机优先的私人菜谱 PWA：收好喜欢的味道，轻松决定下一顿吃什么。界面为简体中文，采用奶油白、自然绿和底部导航。

无需账号、API Key、付费服务或云数据库。菜谱、照片和买菜清单保存在当前浏览器的 IndexedDB 中。

## 先运行起来（第一次做网站也可以）

1. 安装 [Node.js](https://nodejs.org/)，使用 **Node.js 22.12 以上的 22.x 版本**。本项目在 Node.js 22 上构建验证。
2. 如果下载的是 ZIP，先完整解压。不要直接双击 `index.html`，应用需要通过本地服务器运行。
3. 打开「终端」，输入 `cd `（后面有一个空格），将 `what-to-cook` 文件夹拖进终端，再按回车。
4. 逐行执行：

```bash
npm install
npm run dev
```

当前交付位置也可以直接使用：

```bash
cd /Users/yuyidai/Documents/Codex/2026-11-10/i-want-you-to-build-a-2/outputs/what-to-cook
npm run dev
```

看到 `Local: http://localhost:5173/` 后，在浏览器打开这个网址。若端口已被使用，Vite 会显示另一个端口，请以终端输出为准。第一次安装依赖需要联网。

终端窗口需要保持运行。停止时按 **Control + C**。以后再次打开，只需进入文件夹，运行 `npm run dev`。

电脑和 iPhone 连接同一个 Wi-Fi 时，也可用终端显示的 `Network` 网址预览界面。本地局域网的普通 HTTP 网址主要用于看界面；完整安装与离线体验请使用发布后的 HTTPS 网址。

## 已实现的功能

- **今天吃什么**：按分类随机选择；避免连续选中同一道（分类中有多道时）；显示图片、时间与食材。
- **我的菜谱**：名称搜索、七种分类、只看收藏、最近添加 / 用时排序、添加 / 编辑 / 删除。
- **收藏菜谱**：尝试公开网页的 Schema.org Recipe JSON-LD，支持 `@graph`、`HowToStep`、`HowToSection`、ISO 8601 总用时、食材和来源图片。
- **小红书与受限网站**：保留链接；粘贴原文后只整理明确的「食材 / 配料 / 材料」「步骤 / 做法」段落。未标注的文字保留在笔记里，不猜测缺失信息。
- **保存前预览**：完整可编辑的名称、来源、食材、用量、步骤、用时、分类和笔记；可上传本机照片。
- **菜谱详情**：编号步骤、食材勾选、原始链接、收藏、厨房笔记与买菜清单入口。
- **买菜清单**：多选菜谱，合并食材，购买勾选和进度；清单与勾选状态持久保存。
- **我的厨房**：JSON 全量导出、导入前预览、只添加新 ID 的合并恢复，包含照片和清单。
- **首次启动示例**：6 道可编辑、可删除的示例；只有未初始化且数据库为空时加入，删除后不会重新出现。
- **PWA**：中文名称、应用图标、Apple touch icon、独立窗口、离线应用外壳与示例图片缓存、更新提示。

## 网页导入的实际边界

GitHub Pages 只托管静态文件，没有后端代理。浏览器只允许读取支持跨域访问（CORS）的外部网页。因此，**即使菜谱公开且有 Recipe 数据，也可能无法从本应用直接读取**。

本项目直接尝试读取网站公开的 JSON-LD，不使用第三方代理、不发送登录凭证、不绕过登录、验证码、付费墙或其他限制。小红书链接直接提示手动输入。链接和原文整理后仍须在预览中确认保存。

- 自动读取不到的食材、步骤、时间保持为空。
- 分类默认为「其他」，由你核对后选择。
- 分享文字里的网址可识别并保留。
- 原文整理是规则解析，不是 AI 生成；请核对每一行。
- 网站自身需要登录时，请自行在原平台查看，复制你可以访问的内容。
- 网络来源图片依赖原站，可能存在防盗链或离线不可用；**上传本机照片**可获得可靠的离线图片。上传支持 JPG、PNG、WebP，15 MB 以内，自动缩放到最长边 1280 像素。

## 买菜清单怎么合并

名称相同且单位兼容才合并。支持 `g / 克 / kg / 千克 / 公斤 / mg / 毫克 / 斤 / 两` 换算为克，`ml / 毫升 / L / 升 / 公升` 换算为毫升；其他单位只有完全一致才相加。支持数字与 `1/2` 分数。

例如「土豆 1 千克」+「土豆 200 克」→「土豆 1200 克」；「鸡蛋 2 个」+「鸡蛋 1 个」→「鸡蛋 3 个」。

「盐 1 勺」与「盐 5 克」分列；「2–3 个」「半个」「适量」保持原文。同名同单位同样的不确定用量可合并来源，但不换算成数字。名称不同的「小番茄」与「番茄」不自动合并。

重新生成清单时，用量没有变化的食材保留购买勾选。修改或删除菜谱不会悄悄改掉现有清单；请在「选择菜谱」里重新生成以更新食材。

## 本地验证生产版与离线

```bash
npm test
npm run build
npm run preview
```

1. 打开终端显示的 `http://localhost:4173/`（端口可能不同）。
2. 等待「你的厨房，离线也能打开了」提示。开发模式 `npm run dev` 不注册 Service Worker。
3. 新建一份菜谱，上传照片，保存。刷新后检查仍存在。
4. 在桌面浏览器开发者工具的 Network 中设为 Offline，然后刷新并打开菜谱和买菜清单。
5. 完成后关闭 Offline；编辑内容保存后再点击更新提示。

测试覆盖初始化不覆盖、清空后不重种、IndexedDB 重开、完整备份恢复、重复 ID 跳过、错误备份拒绝、单位换算、未知用量保留、结构化数据与原文解析。浏览器测试见 `TESTING.md`。

### 测试 GitHub 仓库子路径

macOS / Linux：

```bash
VITE_BASE_PATH=/what-to-cook/ npm run build
npm run preview
```

然后打开 `http://localhost:4173/what-to-cook/`。PowerShell 可以先执行 `$env:VITE_BASE_PATH='/what-to-cook/'`，再构建。

## 免费发布到 GitHub Pages

网站源码会在公开仓库中展示；你的个人菜谱不会上传到仓库。不要把自己的备份文件放进项目后提交。

### 第一步：把项目上传到自己的仓库

1. 注册或登录 [GitHub](https://github.com/)，新建 **Public（公开）**仓库，建议名称为 `what-to-cook`。
2. 创建仓库时不要勾选添加 README、license 或 .gitignore，项目中已经有文件。
3. 在本项目文件夹的终端执行以下命令，把 `YOUR_USERNAME` 改成自己的 GitHub 用户名：

```bash
git init -b main
git add .
git commit -m "Build 今天吃什么 PWA"
git remote add origin https://github.com/YOUR_USERNAME/what-to-cook.git
git push -u origin main
```

如 Git 第一次要求填写姓名与邮箱，按提示设置后重试 `git commit`。GitHub 不接受账号密码直接作为 Git 推送密码；初学者建议安装 [GitHub Desktop](https://desktop.github.com/)，登录后使用「File → Add Local Repository」添加这个项目，再 Publish / Push。无需在应用中配置任何 API Key。

**必须上传项目根目录**（里面直接有 `package.json`、`src`、`.github`），不要把外层 `outputs` 或包含项目的上级文件夹当成仓库根目录。`.github/workflows/deploy.yml` 是部署所需文件，也必须提交。

### 第二步：启用自动部署

1. 在 GitHub 仓库打开 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **GitHub Actions**。
3. 打开 **Actions**，选择「部署到 GitHub Pages」，等待绿色勾。
4. 如果首次推送时还没启用 Pages，旧的部署可能失败；启用后在 Actions 选择 **Run workflow** 或 **Re-run all jobs** 即可。
5. 在部署详情或 Settings → Pages 中找到正式网址，通常是：

```text
https://YOUR_USERNAME.github.io/what-to-cook/
```

工作流自动安装锁定版本依赖、运行测试、构建、上传 `dist` 并发布。它会依据仓库名自动设置 Vite `base`、PWA `scope`、`start_url` 和缓存路径。你可以使用其他仓库名；如果仓库为 `USERNAME.github.io`，自动使用 `/`。

若以后配置自定义域名，请将工作流的 base 设置改为 `/`，并按 GitHub 的文档配置域名。本 MVP 默认使用普通 GitHub Pages 仓库地址。

以后修改源码后，提交并推送到 `main` 就会自动更新。不必手动提交 `dist`。

## 在 iPhone 主屏幕安装

1. 发布后，用 iPhone 的 **Safari** 打开正式的 HTTPS 网址。
2. 轻点 Safari 的「分享」按钮。
3. 选择「添加到主屏幕」（可能需要向下滚动或在菜单中查找）。
4. 保持名称「今天吃什么」，轻点「添加」。
5. 从主屏幕图标打开，首次保持联网，等待离线资源准备好。
6. 保存几份菜谱后，开启飞行模式，重新打开测试。

无需 App Store、Apple Developer 订阅或付费服务。不同 iOS 版本的菜单位置可能不同。

Safari 与主屏幕 App 的存储在不同系统版本下可能不同。建议尽早在主屏幕 App 中使用；如果内容不同，在原来的入口导出 JSON，再在新的入口导入。

## 数据在什么地方？怎样搬到新手机？

- 数据在**当前设备、当前浏览器、当前网站来源**的 IndexedDB；不会同步到别的设备。
- 「我的厨房 → 导出」保存 JSON 备份到「文件」、iCloud Drive 或自己的安全位置。备份包含笔记、图片和来源，请自行妥善保管。
- 新设备 / 新网址打开后，在「我的厨房 → 导入」选择备份，核对后确认。
- 恢复只添加新的菜谱 ID；已有菜谱保留你现在的版本。当前已有买菜清单时也保留当前清单。
- 清空 Safari 网站数据、无痕会话结束、卸载浏览器、系统存储回收都可能影响本地数据。**本地持久化不等于永久备份，请定期导出。**
- 不同来源（例如 localhost 与 GitHub Pages、不同域名）不会共用数据。更换网址前先备份。
- 本地存储写入失败时会显示提示；请检查剩余空间或浏览器设置。

## 项目结构

```text
what-to-cook/
├── .github/workflows/deploy.yml  # GitHub Pages 自动部署
├── public/
│   ├── icons/                   # PNG / SVG / Apple 图标
│   └── images/                  # 离线示例图片
├── scripts/generate-icons.mjs   # 可重新生成图标
├── src/
│   ├── components/             # 五个页面、详情、编辑器和通用 UI
│   ├── lib/db.ts               # Dexie、首次初始化、备份恢复
│   ├── lib/importer.ts         # 公开 Recipe 与原文规则解析
│   ├── lib/recipes.ts          # 校验、食材合并、图片处理
│   ├── lib/sample.ts           # 首次启动示例菜谱
│   ├── types.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css              # Tailwind CSS + 响应式主题
├── tests/                      # 数据与解析测试
├── index.html
├── vite.config.ts              # PWA、离线缓存、base
├── package.json
├── package-lock.json           # 可重现依赖版本
└── README.md
```

技术栈：React、TypeScript、Vite、Tailwind CSS、Dexie / IndexedDB、vite-plugin-pwa。导航使用 hash，不需要 GitHub Pages 服务器路由重写。所有业务计算在浏览器中进行。

## 常见问题

**打开后是空白页 / 图片没有显示？** 请确认上传的是项目根目录、Pages 选择 GitHub Actions、部署成功、网址带仓库子路径。不要直接双击本地 HTML。

**修改了代码，手机却还是旧界面？** 联网重开，等待更新提示；先保存正在编辑的菜谱再点「更新」。不要为更新随意清空网站数据，先导出备份。

**为什么链接公开，却读取失败？** 通常是跨域限制、网站未提供 Recipe 数据、需要登录或网络超时。使用粘贴原文或手动填写即可。

**怎么修改应用图标？** 修改 `scripts/generate-icons.mjs` 中的 SVG，执行 `npm run icons`，然后重新构建发布。

**有没有热量估算、AI 自动识别、云同步或账号？** 第一版不包含这些服务，也不会为了填满字段而生成没有依据的菜谱信息。

## 参考文档与图片

- [Vite：GitHub Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)
- [Vite PWA：使用指南](https://vite-pwa-org.netlify.app/guide/)
- [Schema.org：Recipe](https://schema.org/Recipe)
- [Dexie 文档](https://dexie.org/docs/)
- 示例摄影来源见 `public/images/ATTRIBUTION.md`。图片仅作菜品氛围参考，示例内容可自由修改或删除。
