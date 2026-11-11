import { test, expect, type Page } from "@playwright/test";

async function navigate(page: Page, route: string) {
  await page.locator(`nav a[href="#${route}"]:visible`).first().click();
}
test("首页推荐、分类筛选和手机布局", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator(".daily-card")).toBeVisible();
  const before = await page.locator(".daily-content h2").textContent();
  await page.getByRole("button", { name: "帮我选一道", exact: true }).click();
  await expect(page.locator(".daily-content h2")).not.toHaveText(before!);
  await expect(
    page.getByRole("button", { name: "再换一道", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "汤", exact: true }).click();
  await expect(page.locator(".daily-content h2")).toHaveText(
    "一锅暖暖的蔬菜汤",
  );
  await page.getByRole("button", { name: "全部菜谱", exact: true }).click();
  await page
    .locator('.pwa-prompt button[aria-label="关闭离线提示"]')
    .click({ timeout: 1500 })
    .catch(() => {});
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-home.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("添加、上传照片、编辑笔记、收藏、搜索、刷新和删除", async ({ page }) => {
  await page.goto("/");
  await navigate(page, "recipes");
  await page
    .getByRole("button", { name: "添加菜谱", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: /菜谱名称/ }).fill("测试番茄炒蛋");
  await dialog.getByLabel("分类", { exact: true }).selectOption("家常菜");
  await dialog.getByLabel("烹饪时间（分钟）").fill("12");
  await dialog
    .locator('input[type="file"]')
    .setInputFiles("public/images/fried-rice.jpg");
  await expect(dialog.getByText("正在处理…")).toHaveCount(0);
  await dialog.getByRole("button", { name: "添加食材" }).click();
  await dialog.getByLabel("食材 1 名称", { exact: true }).fill("鸡蛋");
  await dialog.getByLabel("食材 1 用量", { exact: true }).fill("2");
  await dialog.getByLabel("食材 1 单位", { exact: true }).fill("个");
  await dialog.getByLabel(/烹饪步骤/).fill("打散鸡蛋\n炒熟出锅");
  await dialog.getByLabel("我的笔记", { exact: true }).fill("第一次下厨");
  await dialog.getByRole("button", { name: "保存菜谱", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "测试番茄炒蛋", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".detail-photo img")).toHaveAttribute(
    "src",
    /^data:image\/jpeg/,
  );
  await page.locator(".ingredient-check").first().click();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await page.getByRole("textbox", { name: "我的厨房笔记" }).fill("少放一点盐");
  await page.getByRole("button", { name: "保存笔记", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "保存笔记", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "已收藏", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "测试番茄炒蛋" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "我的厨房笔记" })).toHaveValue(
    "少放一点盐",
  );
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /菜谱名称/ })
    .fill("测试修改后的菜");
  await page
    .getByRole("dialog")
    .getByLabel("我的笔记", { exact: true })
    .fill("编辑器里更新的笔记");
  await page.getByRole("button", { name: "保存菜谱", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "测试修改后的菜" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "我的厨房笔记" })).toHaveValue(
    "编辑器里更新的笔记",
  );
  await navigate(page, "recipes");
  await page.getByRole("textbox", { name: "搜索菜谱名称" }).fill("测试修改");
  await expect(page.locator(".recipe-card")).toHaveCount(1);
  await page.locator(".card-title").click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "删除菜谱", exact: true }).click();
  await page.getByRole("textbox", { name: "搜索菜谱名称" }).fill("测试修改");
  await expect(page.locator(".recipe-card")).toHaveCount(0);
});

test("小红书受限提示、手动草稿与来源保留", async ({ page }) => {
  await page.goto("/");
  await navigate(page, "import");
  await page.getByLabel("粘贴菜谱链接").fill("好吃 https://xhslink.com/a/test");
  await page.getByRole("button", { name: "尝试读取链接", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "小红书暂不支持" }),
  ).toBeVisible();
  await page
    .getByLabel("笔记 / 菜谱原文")
    .fill("原文蛋羹\n食材：\n鸡蛋 2 个\n步骤：\n1. 打散鸡蛋\n2. 蒸熟");
  await page
    .getByRole("button", { name: "整理为草稿，检查后收藏", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("textbox", { name: /菜谱名称/ })).toHaveValue(
    "原文蛋羹",
  );
  await expect(dialog.getByLabel("原始链接")).toHaveValue(
    "https://xhslink.com/a/test",
  );
  await expect(dialog.getByLabel("食材 1 用量", { exact: true })).toHaveValue(
    "2",
  );
  await dialog.getByRole("button", { name: "保存菜谱", exact: true }).click();
  await expect(page.getByRole("heading", { name: "原文蛋羹" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "查看原始菜谱" }),
  ).toHaveAttribute("href", "https://xhslink.com/a/test");
});

test("选择菜谱、合并食材、购买勾选与刷新持久化", async ({ page }) => {
  await page.goto("/");
  await navigate(page, "shopping");
  await page
    .getByRole("button", { name: "选择菜谱", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .locator(".recipe-selection")
    .filter({ hasText: "家常黄金蛋炒饭" })
    .click();
  await dialog
    .locator(".recipe-selection")
    .filter({ hasText: "暖心香菇汤面" })
    .click();
  await dialog.getByRole("button", { name: "生成买菜清单" }).click();
  const egg = page
    .locator(".shopping-item")
    .filter({ has: page.locator("strong", { hasText: /^鸡蛋$/ }) });
  await expect(egg).toHaveCount(1);
  await expect(egg).toContainText("3个");
  await egg.click();
  await page.reload();
  await expect(egg.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "重置勾选", exact: true }).click();
  await expect(egg.getByRole("checkbox")).not.toBeChecked();
});

test("备份导出、导入预览与重复恢复不覆盖", async ({ page }) => {
  await page.goto("/");
  await navigate(page, "settings");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const download = await downloadEvent;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(
    page.getByRole("dialog", { name: "确认恢复备份" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("跳过 6 道已有菜谱");
  await page.getByRole("button", { name: "确认导入新菜谱" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "恢复完成：新增 0 道，跳过 6 道" }),
  ).toBeVisible();
});

test("生产 Service Worker 缓存、离线重开与离线编辑", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".daily-card")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".daily-card")).toBeVisible();
  await expect(page.locator(".daily-image img")).toBeVisible();
  expect(
    await page
      .locator(".daily-image img")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  const title = (await page.locator(".daily-content h2").textContent())!;
  await page.getByRole("button", { name: "查看做法", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "我的厨房笔记" })
    .fill("离线保存的笔记");
  await page.getByRole("button", { name: "保存笔记", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "我的厨房笔记" })).toHaveValue(
    "离线保存的笔记",
  );
  await context.setOffline(false);
});
