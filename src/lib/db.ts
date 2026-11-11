import Dexie, { type Table } from "dexie";
import type { Backup, Recipe, ShoppingItem, ShoppingState } from "../types";
import { samples } from "./sample";
import { validateRecipe } from "./recipes";

export class KitchenDB extends Dexie {
  recipes!: Table<Recipe, string>;
  shopping!: Table<ShoppingState, string>;
  meta!: Table<{ key: string; value: string }, string>;
  constructor(name = "what-to-cook") {
    super(name);
    this.version(1).stores({
      recipes: "id, title, category, favorite, createdAt",
      shopping: "id",
      meta: "key",
    });
  }
}
export const db = new KitchenDB();
export async function initialize(database = db) {
  await database.transaction(
    "rw",
    database.recipes,
    database.meta,
    async () => {
      if (!(await database.meta.get("initialized"))) {
        if ((await database.recipes.count()) === 0)
          await database.recipes.bulkAdd(samples);
        await database.meta.put({ key: "initialized", value: "1" });
      }
    },
  );
}
export async function putRecipe(recipe: Recipe) {
  const validated = validateRecipe({ ...recipe, updatedAt: Date.now() });
  await db.recipes.put(validated);
}
export async function exportBackup(database = db): Promise<Backup> {
  return database.transaction(
    "r",
    database.recipes,
    database.shopping,
    async () => ({
      app: "what-to-cook",
      version: 1,
      exportedAt: new Date().toISOString(),
      recipes: await database.recipes.toArray(),
      shopping: await database.shopping.get("current"),
    }),
  );
}
export function parseBackup(raw: string): Backup {
  if (raw.length > 50 * 1024 * 1024) throw new Error("备份文件请小于 50 MB");
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("无法读取 JSON，请选择本应用导出的备份");
  }
  if (
    !value ||
    value.app !== "what-to-cook" ||
    value.version !== 1 ||
    !Array.isArray(value.recipes) ||
    value.recipes.length > 5000
  )
    throw new Error("备份版本或文件格式不支持");
  const recipes = value.recipes.map(validateRecipe);
  if (new Set(recipes.map((r) => r.id)).size !== recipes.length)
    throw new Error("备份中存在重复的菜谱编号");
  let shopping: ShoppingState | undefined;
  if (value.shopping !== undefined) {
    const s = value.shopping as ShoppingState;
    if (
      !s ||
      s.id !== "current" ||
      !Array.isArray(s.recipeIds) ||
      !s.recipeIds.every((id) => typeof id === "string" && id.length < 201) ||
      !Array.isArray(s.items) ||
      s.items.length > 5000 ||
      !Number.isFinite(s.updatedAt)
    )
      throw new Error("买菜清单格式不正确");
    const items = s.items.map((item): ShoppingItem => {
      if (
        !item ||
        !["id", "name", "amount", "unit"].every(
          (k) =>
            typeof (item as unknown as Record<string, unknown>)[k] ===
              "string" &&
            String((item as unknown as Record<string, unknown>)[k]).length <
              2000,
        ) ||
        typeof item.checked !== "boolean" ||
        !Array.isArray(item.recipes) ||
        !item.recipes.every((r) => typeof r === "string" && r.length <= 200)
      )
        throw new Error("买菜清单食材格式不正确");
      return {
        id: item.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        checked: item.checked,
        recipes: item.recipes,
      };
    });
    shopping = {
      id: "current",
      recipeIds: s.recipeIds,
      items,
      updatedAt: s.updatedAt,
    };
  }
  return {
    app: "what-to-cook",
    version: 1,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : "",
    recipes,
    shopping,
  };
}
export async function importBackup(backup: Backup, database = db) {
  let added = 0;
  await database.transaction(
    "rw",
    database.recipes,
    database.shopping,
    database.meta,
    async () => {
      for (const recipe of backup.recipes) {
        // Existing IDs are never overwritten, even if timestamps in the backup are newer.
        if (!(await database.recipes.get(recipe.id))) {
          await database.recipes.add(recipe);
          added++;
        }
      }
      if (backup.shopping && !(await database.shopping.get("current")))
        await database.shopping.put(backup.shopping);
      await database.meta.put({ key: "initialized", value: "1" });
    },
  );
  return { added, skipped: backup.recipes.length - added };
}
