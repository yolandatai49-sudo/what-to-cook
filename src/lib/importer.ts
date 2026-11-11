import type { Recipe } from "../types";
import { newRecipe, parseIngredient, safeImage, safeUrl } from "./recipes";

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return (
    new DOMParser()
      .parseFromString(value, "text/html")
      .body.textContent?.trim() || ""
  );
}
function durationMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!m) return null;
  const n =
    Number(m[1] || 0) * 1440 +
    Number(m[2] || 0) * 60 +
    Number(m[3] || 0) +
    Math.ceil(Number(m[4] || 0) / 60);
  return n > 0 && n <= 10080 ? n : null;
}
function instructionText(value: unknown): string[] {
  if (typeof value === "string")
    return value.split(/\n+/).map(cleanText).filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(instructionText);
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  if (item.itemListElement) return instructionText(item.itemListElement);
  return typeof item.text === "string"
    ? [cleanText(item.text)].filter(Boolean)
    : [];
}
export function recipeFromHtml(html: string, sourceUrl: string): Recipe | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const candidates: Record<string, unknown>[] = [];
  const scan = (v: unknown, depth = 0) => {
    if (depth > 25) return;
    if (Array.isArray(v)) {
      v.forEach((item) => scan(item, depth + 1));
      return;
    }
    if (!v || typeof v !== "object") return;
    const obj = v as Record<string, unknown>;
    const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
    if (types.some((t) => typeof t === "string" && /(^|[/#])Recipe$/.test(t)))
      candidates.push(obj);
    Object.values(obj).forEach((item) => {
      if (typeof item === "object") scan(item, depth + 1);
    });
  };
  doc
    .querySelectorAll('script[type="application/ld+json"]')
    .forEach((script) => {
      try {
        scan(JSON.parse(script.textContent || ""));
      } catch {
        /* malformed JSON-LD is ignored */
      }
    });
  const raw = candidates.find((v) => cleanText(v.name));
  if (!raw) return null;
  let image = Array.isArray(raw.image) ? raw.image[0] : raw.image;
  if (image && typeof image === "object")
    image =
      (image as Record<string, unknown>).url ||
      (image as Record<string, unknown>).contentUrl;
  let imageUrl = "";
  if (typeof image === "string") {
    try {
      imageUrl = safeImage(new URL(image, sourceUrl).href);
    } catch {
      /* no image */
    }
  }
  return {
    ...newRecipe(),
    title: cleanText(raw.name).slice(0, 200),
    sourceUrl,
    image: imageUrl,
    ingredients: Array.isArray(raw.recipeIngredient)
      ? raw.recipeIngredient
          .filter((v) => typeof v === "string")
          .map((v) => parseIngredient(cleanText(v)))
      : [],
    steps: instructionText(raw.recipeInstructions),
    minutes: durationMinutes(raw.totalTime),
    category: "其他",
    notes: cleanText(raw.description),
  };
}
export function extractSourceUrl(input: string) {
  const match = input.match(/https?:\/\/[^\s<>"'，。；！）)]+/);
  return match ? safeUrl(match[0]) : "";
}
export async function importUrl(
  input: string,
  signal?: AbortSignal,
): Promise<Recipe> {
  const url = extractSourceUrl(input);
  if (!url) throw new Error("请粘贴完整的 http:// 或 https:// 链接");
  if (/(^|\.)(xiaohongshu\.com|xhslink\.com)$/i.test(new URL(url).hostname))
    throw new Error(
      "小红书暂不支持自动读取。原链接已保留，请粘贴笔记原文或手动填写。",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch(url, {
      credentials: "omit",
      signal: controller.signal,
      headers: { Accept: "text/html" },
    });
    if (!response.ok) throw new Error("网页暂时无法读取");
    const length = Number(response.headers.get("content-length"));
    if (length > 4_000_000) throw new Error("网页过大，请手动填写");
    const html = await response.text();
    if (html.length > 4_000_000) throw new Error("网页过大，请手动填写");
    const result = recipeFromHtml(html, url);
    if (!result)
      throw new Error("网页未提供可读取的 Recipe 数据。请粘贴原文或手动填写。");
    return result;
  } catch (e) {
    if (
      e instanceof TypeError ||
      (e instanceof DOMException && e.name === "AbortError")
    )
      throw new Error(
        "浏览器无法读取此网站（可能存在跨域限制或超时）。原链接已保留，请粘贴原文或手动填写。",
      );
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

// Only explicit sections are extracted. Unstructured text is retained as a note.
export function draftFromText(text: string, sourceUrl: string): Recipe {
  const draft = {
    ...newRecipe(),
    sourceUrl,
    category: "其他" as const,
    notes: text.trim(),
  };
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const title = lines[0];
  if (title && !/^(食材|配料|材料|做法|步骤|https?:)/.test(title))
    draft.title = title.replace(/^#+\s*/, "").slice(0, 200);
  let section: "ingredients" | "steps" | null = null;
  for (const line of lines.slice(draft.title ? 1 : 0)) {
    const heading = line.match(
      /^(?:【|\[|#+\s*)?(食材|配料|材料|做法|步骤)(?:】|\])?\s*[：:]?\s*(.*)$/,
    );
    if (heading) {
      section = ["食材", "配料", "材料"].includes(heading[1])
        ? "ingredients"
        : "steps";
      if (heading[2]) {
        if (section === "ingredients")
          draft.ingredients.push(
            ...heading[2]
              .split(/[，、,；;]/)
              .filter(Boolean)
              .map(parseIngredient),
          );
        else draft.steps.push(heading[2]);
      }
      continue;
    }
    if (
      /^(备注|小贴士|注意|笔记|用时|时间|分类|营养|来源)[：:]/.test(line) ||
      /^https?:/.test(line)
    ) {
      section = null;
      continue;
    }
    if (section === "ingredients")
      draft.ingredients.push(
        ...line
          .split(/[，、,；;]/)
          .filter(Boolean)
          .map(parseIngredient),
      );
    if (section === "steps")
      draft.steps.push(line.replace(/^\d+[.、）)]\s*/, ""));
  }
  return draft;
}
