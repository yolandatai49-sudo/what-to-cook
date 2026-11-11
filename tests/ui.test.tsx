import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";
import { db } from "../src/lib/db";

beforeEach(async () => {
  cleanup();
  window.location.hash = "";
  await db.recipes.clear();
  await db.shopping.clear();
  await db.meta.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function start() {
  render(<App />);
  await waitFor(() =>
    expect(document.querySelector(".daily-card")).not.toBeNull(),
  );
}
async function go(route: string) {
  fireEvent.click(document.querySelector(`a[href="#${route}"]`)!);
  await waitFor(() => expect(window.location.hash).toBe(`#${route}`));
}

describe("真实 React 页面与 IndexedDB 交互（DOM 环境）", () => {
  it("首页可换菜、筛选，菜谱本可搜索与收藏", async () => {
    const user = userEvent.setup();
    await start();
    const before = document.querySelector(".daily-content h2")!.textContent;
    await user.click(screen.getByRole("button", { name: "帮我选一道" }));
    expect(document.querySelector(".daily-content h2")!.textContent).not.toBe(
      before,
    );
    await user.click(screen.getByRole("button", { name: "汤" }));
    expect(document.querySelector(".daily-content h2")!.textContent).toBe(
      "一锅暖暖的蔬菜汤",
    );
    await go("recipes");
    const search = await screen.findByRole("textbox", { name: "搜索菜谱名称" });
    await user.type(search, "黄金");
    expect(document.querySelectorAll(".recipe-card")).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "取消收藏家常黄金蛋炒饭" }),
    );
    await waitFor(async () =>
      expect((await db.recipes.get("sample-fried-rice"))?.favorite).toBe(false),
    );
  });

  it("创建、编辑和删除菜谱；编辑器笔记立即更新到详情", async () => {
    const user = userEvent.setup();
    await start();
    await go("recipes");
    await user.click(
      (await screen.findAllByRole("button", { name: "添加菜谱" }))[0],
    );
    let dialog = within(screen.getByRole("dialog"));
    await user.type(
      dialog.getByRole("textbox", { name: /菜谱名称/ }),
      "组件测试炒蛋",
    );
    await user.click(dialog.getByRole("button", { name: "添加食材" }));
    await user.type(
      dialog.getByRole("textbox", { name: "食材 1 名称" }),
      "鸡蛋",
    );
    await user.type(dialog.getByRole("textbox", { name: "食材 1 用量" }), "2");
    await user.type(dialog.getByRole("textbox", { name: "食材 1 单位" }), "个");
    await user.type(dialog.getByLabelText(/烹饪步骤/), "打散\n炒熟");
    await user.click(dialog.getByRole("button", { name: "保存菜谱" }));
    await screen.findByRole("heading", { name: "组件测试炒蛋" });
    expect(
      (await db.recipes.toArray()).find((r) => r.title === "组件测试炒蛋")
        ?.ingredients[0].amount,
    ).toBe("2");
    await user.click(screen.getByRole("button", { name: "编辑" }));
    dialog = within(screen.getByRole("dialog"));
    await user.type(
      dialog.getByLabelText("我的笔记", { exact: true }),
      "新笔记",
    );
    await user.click(dialog.getByRole("button", { name: "保存菜谱" }));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "我的厨房笔记",
          }) as HTMLTextAreaElement
        ).value,
      ).toBe("新笔记"),
    );
    await user.click(screen.getByRole("button", { name: "删除菜谱" }));
    await screen.findByRole("textbox", { name: "搜索菜谱名称" });
    expect(
      (await db.recipes.toArray()).some((r) => r.title === "组件测试炒蛋"),
    ).toBe(false);
  });

  it("小红书导入保留来源，明确原文段落变为可审核草稿", async () => {
    const user = userEvent.setup();
    await start();
    await go("import");
    await user.type(
      await screen.findByLabelText("粘贴菜谱链接"),
      "https://xhslink.com/a/test",
    );
    await user.click(screen.getByRole("button", { name: "尝试读取链接" }));
    await screen.findByText(/小红书暂不支持自动读取/);
    await user.type(
      screen.getByLabelText("笔记 / 菜谱原文"),
      "家常蛋羹\n食材：\n鸡蛋 2 个\n步骤：\n1. 蒸熟",
    );
    await user.click(
      screen.getByRole("button", { name: "整理为草稿，检查后收藏" }),
    );
    const dialog = within(screen.getByRole("dialog"));
    expect((dialog.getByLabelText("原始链接") as HTMLInputElement).value).toBe(
      "https://xhslink.com/a/test",
    );
    expect(
      (
        dialog.getByLabelText("食材 1 用量", {
          exact: true,
        }) as HTMLInputElement
      ).value,
    ).toBe("2");
    await user.click(dialog.getByRole("button", { name: "保存菜谱" }));
    await screen.findByRole("heading", { name: "家常蛋羹" });
    expect(
      screen.getByRole("link", { name: "查看原始菜谱" }).getAttribute("href"),
    ).toBe("https://xhslink.com/a/test");
  });

  it("多选菜谱生成合并清单，购买勾选写入 IndexedDB", async () => {
    const user = userEvent.setup();
    await start();
    await go("shopping");
    await user.click(
      (await screen.findAllByRole("button", { name: "选择菜谱" }))[0],
    );
    const dialog = within(screen.getByRole("dialog"));
    await user.click(dialog.getByRole("checkbox", { name: /家常黄金蛋炒饭/ }));
    await user.click(dialog.getByRole("checkbox", { name: /暖心香菇汤面/ }));
    await user.click(dialog.getByRole("button", { name: "生成买菜清单" }));
    await waitFor(() =>
      expect(document.querySelector(".shopping-items")).not.toBeNull(),
    );
    const egg = [
      ...document.querySelectorAll<HTMLLabelElement>(".shopping-item"),
    ].find((el) => el.querySelector("strong")?.textContent === "鸡蛋")!;
    expect(egg.textContent).toContain("3个");
    await user.click(egg);
    await waitFor(async () =>
      expect(
        (await db.shopping.get("current"))?.items.find((i) => i.name === "鸡蛋")
          ?.checked,
      ).toBe(true),
    );
  });
});
