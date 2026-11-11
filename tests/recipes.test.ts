import { describe, expect, it } from "vitest";
import {
  combineIngredients,
  newRecipe,
  parseIngredient,
  safeImage,
  safeUrl,
} from "../src/lib/recipes";
import {
  draftFromText,
  extractSourceUrl,
  importUrl,
  recipeFromHtml,
} from "../src/lib/importer";
import type { Ingredient } from "../src/types";
const recipe = (title: string, ingredients: Ingredient[]) => ({
  ...newRecipe(),
  title,
  ingredients,
});

describe("买菜清单合并", () => {
  it("合并质量单位、体积单位并保留来源", () => {
    const list = combineIngredients([
      recipe("甲", [
        { name: "土豆", amount: "1", unit: "千克" },
        { name: "牛奶", amount: "0.5", unit: "L" },
      ]),
      recipe("乙", [
        { name: "土豆", amount: "200", unit: "克" },
        { name: "牛奶", amount: "100", unit: "毫升" },
      ]),
    ]);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      name: "土豆",
      amount: "1200",
      unit: "克",
      recipes: ["甲", "乙"],
    });
    expect(list[1]).toMatchObject({ amount: "600", unit: "毫升" });
  });
  it("不会猜测范围、适量或不兼容单位", () => {
    const list = combineIngredients([
      recipe("甲", [
        { name: "盐", amount: "1", unit: "勺" },
        { name: "盐", amount: "5", unit: "克" },
        { name: "盐", amount: "适量", unit: "" },
        { name: "盐", amount: "2-3", unit: "克" },
      ]),
    ]);
    expect(list).toHaveLength(4);
    expect(list.map((i) => i.amount)).toEqual(["1", "5", "适量", "2-3"]);
  });
  it("处理分数及相同计数单位，不合并不同的食材", () => {
    const list = combineIngredients([
      recipe("甲", [
        { name: "鸡蛋", amount: "2", unit: "个" },
        { name: "黄瓜", amount: "1/2", unit: "根" },
      ]),
      recipe("乙", [
        { name: "鸡蛋", amount: "1", unit: "个" },
        { name: "黄瓜", amount: "1/2", unit: "根" },
        { name: "小黄瓜", amount: "1", unit: "根" },
      ]),
    ]);
    expect(list.map((i) => i.amount)).toEqual(["3", "1", "1"]);
  });
  it("相同不确定用量合并名称和来源，不将其转成数字", () => {
    const list = combineIngredients([
      recipe("甲", [{ name: "盐", amount: "适量", unit: "" }]),
      recipe("乙", [{ name: "盐", amount: "适量", unit: "" }]),
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ amount: "适量", recipes: ["甲", "乙"] });
  });
});
describe("保守的食材解析", () => {
  it.each([
    ["鸡蛋 2 个", { name: "鸡蛋", amount: "2", unit: "个" }],
    ["面粉：100 g", { name: "面粉", amount: "100", unit: "g" }],
    ["盐 少许", { name: "盐", amount: "少许", unit: "" }],
    ["番茄 2-3 个", { name: "番茄 2-3 个", amount: "", unit: "" }],
    ["生抽按口味添加", { name: "生抽按口味添加", amount: "", unit: "" }],
  ])("%s", (line, want) => expect(parseIngredient(line)).toEqual(want));
});
describe("来源与结构化数据", () => {
  it("读取 @graph、HowToSection、图片及 ISO 时间", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": ["Recipe"], name: "<b>番茄鸡蛋</b>", totalTime: "PT1H15M", image: { url: "/dish.jpg" }, recipeIngredient: ["鸡蛋 2 个"], recipeInstructions: [{ "@type": "HowToSection", itemListElement: [{ "@type": "HowToStep", text: "<p>打散鸡蛋。</p>" }] }] }] })}</script>`;
    const result = recipeFromHtml(html, "https://example.com/recipe");
    expect(result).toMatchObject({
      title: "番茄鸡蛋",
      minutes: 75,
      image: "https://example.com/dish.jpg",
      steps: ["打散鸡蛋。"],
      ingredients: [{ name: "鸡蛋", amount: "2", unit: "个" }],
    });
  });
  it("不补写缺失信息，也不执行 HTML", () => {
    const result = recipeFromHtml(
      '<script type="application/ld+json">{"@type":"Recipe","name":"无详情"}</script>',
      "https://example.com",
    );
    expect(result).toMatchObject({ ingredients: [], steps: [], minutes: null });
    expect(
      recipeFromHtml(
        "<script>throw new Error()</script>",
        "https://example.com",
      ),
    ).toBeNull();
  });
  it("可跳过畸形 JSON，继续读取有效数据", () => {
    expect(
      recipeFromHtml(
        '<script type="application/ld+json">{oops</script><script type="application/ld+json">{"@type":"Recipe","name":"汤"}</script>',
        "https://example.com",
      )?.title,
    ).toBe("汤");
  });
  it("小红书自动读取直接转入手动流程", async () => {
    await expect(importUrl("https://xhslink.com/a/test")).rejects.toThrow(
      "小红书",
    );
  });
  it("整理明确段落并完整保留原文", () => {
    const text =
      "番茄炒蛋\n食材：\n番茄 2 个\n鸡蛋 3 个\n步骤：\n1. 切块\n2. 翻炒";
    const r = draftFromText(text, "https://example.com");
    expect(r.title).toBe("番茄炒蛋");
    expect(r.ingredients).toHaveLength(2);
    expect(r.steps).toEqual(["切块", "翻炒"]);
    expect(r.notes).toBe(text);
  });
  it("未标注段落时不猜食材和步骤", () => {
    const r = draftFromText("好吃的菜\n今天做了两颗蛋，下次还要做", "");
    expect(r.ingredients).toEqual([]);
    expect(r.steps).toEqual([]);
    expect(r.notes).toContain("两颗蛋");
  });
  it("从分享文本提取链接并拒绝危险协议", () => {
    expect(extractSourceUrl("看看这道菜 https://example.com/recipe。")).toBe(
      "https://example.com/recipe",
    );
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("https://user:password@example.com")).toBe("");
    expect(safeImage('data:image/svg+xml,<svg onload="alert(1)"/>')).toBe("");
  });
});
