import { afterEach, describe, expect, it } from "vitest";
import {
  exportBackup,
  importBackup,
  initialize,
  KitchenDB,
  parseBackup,
} from "../src/lib/db";
import { newRecipe } from "../src/lib/recipes";
const databases: KitchenDB[] = [];
function database() {
  const d = new KitchenDB(`test-${crypto.randomUUID()}`);
  databases.push(d);
  return d;
}
afterEach(async () => {
  for (const d of databases) await d.delete();
  databases.length = 0;
});
describe("持久化与首次启动", () => {
  it("只初始化一次，删除所有菜谱后不会重新加入示例", async () => {
    const d = database();
    await Promise.all([initialize(d), initialize(d)]);
    expect(await d.recipes.count()).toBe(6);
    await d.recipes.clear();
    await initialize(d);
    expect(await d.recipes.count()).toBe(0);
  });
  it("已有用户数据时不添加或覆盖示例", async () => {
    const d = database();
    await d.recipes.add({ ...newRecipe(), title: "我的菜" });
    await initialize(d);
    expect(await d.recipes.count()).toBe(1);
    expect((await d.recipes.toArray())[0].title).toBe("我的菜");
  });
  it("关闭再打开，数据仍在", async () => {
    const d = database();
    const r = { ...newRecipe(), title: "存下来的味道" };
    await d.recipes.put(r);
    d.close();
    await d.open();
    expect(await d.recipes.get(r.id)).toEqual(r);
  });
});
describe("备份恢复", () => {
  it("可完整导出、校验、导入菜谱和清单，重复导入不覆盖修改", async () => {
    const a = database(),
      b = database();
    const r = {
      ...newRecipe(),
      title: "备份菜谱",
      notes: "我的笔记",
      image: "data:image/jpeg;base64,YWJj",
    };
    await a.recipes.add(r);
    await a.shopping.put({
      id: "current",
      items: [
        {
          id: "egg",
          name: "鸡蛋",
          amount: "2",
          unit: "个",
          recipes: [r.title],
          checked: true,
        },
      ],
      recipeIds: [r.id],
      updatedAt: Date.now(),
    });
    const parsed = parseBackup(JSON.stringify(await exportBackup(a)));
    expect(await importBackup(parsed, b)).toEqual({ added: 1, skipped: 0 });
    expect(await b.recipes.get(r.id)).toEqual(r);
    expect((await b.shopping.get("current"))?.items[0].checked).toBe(true);
    await b.recipes.update(r.id, { title: "后来修改过" });
    expect(await importBackup(parsed, b)).toEqual({ added: 0, skipped: 1 });
    expect((await b.recipes.get(r.id))?.title).toBe("后来修改过");
  });
  it("保留当前已有清单", async () => {
    const d = database();
    await d.shopping.put({
      id: "current",
      recipeIds: [],
      items: [],
      updatedAt: 99,
    });
    await importBackup(
      {
        app: "what-to-cook",
        version: 1,
        exportedAt: "",
        recipes: [],
        shopping: { id: "current", recipeIds: ["x"], items: [], updatedAt: 1 },
      },
      d,
    );
    expect((await d.shopping.get("current"))?.updatedAt).toBe(99);
  });
  it("拒绝无效备份、危险 URL、无效菜谱和重复编号", () => {
    const backup = {
      app: "what-to-cook",
      version: 1,
      recipes: [{ ...newRecipe(), title: "菜" }],
    };
    expect(() => parseBackup("not-json")).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...backup, version: 2 })),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...backup,
          recipes: [{ ...backup.recipes[0], sourceUrl: "javascript:alert(1)" }],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...backup,
          recipes: [backup.recipes[0], backup.recipes[0]],
        }),
      ),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...backup,
          recipes: [{ ...backup.recipes[0], minutes: -3 }],
        }),
      ),
    ).toThrow();
  });
});
