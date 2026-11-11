import type { Category, Ingredient, Recipe, ShoppingItem } from "../types";
import { CATEGORIES } from "../types";

export function newRecipe(): Recipe {
  return {
    id: crypto.randomUUID(),
    title: "",
    category: "家常菜",
    minutes: null,
    image: "",
    ingredients: [],
    steps: [],
    sourceUrl: "",
    notes: "",
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function safeUrl(input: string): string {
  try {
    const url = new URL(input);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function safeImage(input: string): string {
  if (
    /^data:image\/(jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(input) &&
    input.length < 6_000_000
  )
    return input;
  if (/^images\/[a-z\d-]+\.jpg$/i.test(input)) return input;
  return safeUrl(input);
}

export function imageSource(image: string) {
  return image.startsWith("images/")
    ? `${import.meta.env.BASE_URL}${image}`
    : safeImage(image);
}

// Quantity parsing is deliberately conservative: ranges and free text never get guessed.
export function parseIngredient(line: string): Ingredient {
  const cleaned = line.replace(/^[-•·]\s*/, "").trim();
  const match = cleaned.match(
    /^(.+?)\s*[：:]?\s*(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)\s*(千克|公斤|毫克|克|毫升|公升|升|斤|两|kg|mg|g|ml|l|个|根|瓣|勺|茶匙|汤匙|片|把|碗|袋|盒|杯|枚|颗)\s*$/i,
  );
  if (match && !/[\d~～至\-—]$/.test(match[1].trim()))
    return {
      name: match[1].replace(/[：:]$/, "").trim(),
      amount: match[2],
      unit: match[3],
    };
  const unspecified = cleaned.match(/^(.+?)\s*[：:]?\s*(适量|少许|若干)$/);
  if (unspecified)
    return {
      name: unspecified[1].replace(/[：:]$/, "").trim(),
      amount: unspecified[2],
      unit: "",
    };
  return { name: cleaned, amount: "", unit: "" };
}

const units: Record<string, [string, number]> = {
  g: ["克", 1],
  克: ["克", 1],
  kg: ["克", 1000],
  千克: ["克", 1000],
  公斤: ["克", 1000],
  mg: ["克", 0.001],
  毫克: ["克", 0.001],
  斤: ["克", 500],
  两: ["克", 50],
  ml: ["毫升", 1],
  毫升: ["毫升", 1],
  l: ["毫升", 1000],
  升: ["毫升", 1000],
  公升: ["毫升", 1000],
};
const numberValue = (s: string) => {
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(s)) {
    const [a, b] = s.split("/").map(Number);
    return b ? a / b : null;
  }
  return null;
};
export function combineIngredients(recipes: Recipe[]): ShoppingItem[] {
  const groups = new Map<string, ShoppingItem & { total: number | null }>();
  for (const recipe of recipes)
    for (const i of recipe.ingredients) {
      const name = i.name.trim().replace(/\s+/g, " ");
      if (!name) continue;
      const quantity = numberValue(i.amount.trim());
      const [unit, multiplier] = units[i.unit.trim().toLowerCase()] || [
        i.unit.trim(),
        1,
      ];
      // Keep unknown quantities separate from numeric quantities; never convert spoons to grams.
      const key = JSON.stringify([
        name.toLowerCase(),
        unit,
        quantity === null ? i.amount.trim() : "#number",
      ]);
      const existing = groups.get(key);
      if (existing) {
        if (quantity !== null && existing.total !== null)
          existing.total += quantity * multiplier;
        if (!existing.recipes.includes(recipe.title))
          existing.recipes.push(recipe.title);
      } else
        groups.set(key, {
          id: key,
          name,
          amount: i.amount.trim(),
          unit,
          recipes: [recipe.title],
          checked: false,
          total: quantity === null ? null : quantity * multiplier,
        });
    }
  return [...groups.values()].map(({ total, ...item }) => ({
    ...item,
    amount:
      total === null ? item.amount : String(Math.round(total * 1000) / 1000),
  }));
}

export function validateRecipe(value: unknown): Recipe {
  if (!value || typeof value !== "object") throw new Error("菜谱格式不正确");
  const r = value as Record<string, unknown>;
  const str = (v: unknown, max = 100_000): v is string =>
    typeof v === "string" && v.length <= max;
  if (
    !str(r.id, 200) ||
    !r.id ||
    !str(r.title, 200) ||
    !r.title.trim() ||
    !CATEGORIES.includes(r.category as Category) ||
    !(
      r.minutes === null ||
      (typeof r.minutes === "number" &&
        Number.isFinite(r.minutes) &&
        r.minutes > 0 &&
        r.minutes <= 10080)
    ) ||
    !str(r.image, 6_000_000) ||
    !str(r.sourceUrl, 4000) ||
    !str(r.notes) ||
    typeof r.favorite !== "boolean" ||
    typeof r.createdAt !== "number" ||
    !Number.isFinite(r.createdAt) ||
    typeof r.updatedAt !== "number" ||
    !Number.isFinite(r.updatedAt) ||
    !Array.isArray(r.ingredients) ||
    r.ingredients.length > 300 ||
    !Array.isArray(r.steps) ||
    r.steps.length > 300
  )
    throw new Error("菜谱字段不完整或格式不正确");
  const ingredients = r.ingredients.map((v) => {
    if (
      !v ||
      typeof v !== "object" ||
      !str(v.name, 500) ||
      !v.name.trim() ||
      !str(v.amount, 100) ||
      !str(v.unit, 100)
    )
      throw new Error("食材格式不正确");
    return { name: v.name.trim(), amount: v.amount, unit: v.unit };
  });
  if (!r.steps.every((v) => str(v, 10000)))
    throw new Error("烹饪步骤格式不正确");
  if (r.sourceUrl && !safeUrl(r.sourceUrl as string))
    throw new Error("原链接必须以 http:// 或 https:// 开头");
  if (r.image && !safeImage(r.image as string))
    throw new Error("图片格式不支持");
  return {
    id: r.id as string,
    title: (r.title as string).trim(),
    category: r.category as Category,
    minutes: r.minutes as number | null,
    image: r.image as string,
    sourceUrl: r.sourceUrl as string,
    notes: r.notes as string,
    favorite: r.favorite,
    ingredients,
    steps: (r.steps as string[]).filter((s) => s.trim()),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function imageFileToDataUrl(file: Blob): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("请选择 JPG、PNG 或 WebP 图片");
  if (file.size > 15 * 1024 * 1024) throw new Error("图片请小于 15 MB");
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = objectUrl;
    await img.decode();
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("当前浏览器无法处理图片");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
