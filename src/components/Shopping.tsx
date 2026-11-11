import { useState } from "react";
import {
  Check,
  CheckCheck,
  ChevronRight,
  Plus,
  RotateCcw,
  ShoppingBasket,
  X,
} from "lucide-react";
import type { Recipe, ShoppingState } from "../types";
import { db } from "../lib/db";
import { combineIngredients } from "../lib/recipes";
import { EmptyState, Modal, RecipeImage } from "./ui";

export async function saveShoppingSelection(
  ids: string[],
  recipes: Recipe[],
  preserve = true,
) {
  const previous = await db.shopping.get("current");
  const items = combineIngredients(
    recipes.filter((r) => ids.includes(r.id)),
  ).map((item) => ({
    ...item,
    checked: preserve
      ? !!previous?.items.find(
          (i) => i.id === item.id && i.amount === item.amount,
        )?.checked
      : false,
  }));
  const recipeIds = ids.filter((id) => recipes.some((r) => r.id === id));
  await db.shopping.put({
    id: "current",
    recipeIds,
    items,
    updatedAt: Date.now(),
  });
  return items.length;
}
export function Shopping({
  recipes,
  state,
  notify,
  onLibrary,
}: {
  recipes: Recipe[];
  state: ShoppingState | undefined;
  notify: (s: string) => void;
  onLibrary: () => void;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const items = state?.items || [];
  const bought = items.filter((i) => i.checked).length;
  const openSelection = () => {
    setSelection(
      (state?.recipeIds || []).filter((id) => recipes.some((r) => r.id === id)),
    );
    setSelecting(true);
  };
  async function toggle(id: string) {
    try {
      await db.transaction("rw", db.shopping, async () => {
        const current = await db.shopping.get("current");
        if (current)
          await db.shopping.put({
            ...current,
            items: current.items.map((i) =>
              i.id === id ? { ...i, checked: !i.checked } : i,
            ),
            updatedAt: Date.now(),
          });
      });
    } catch {
      notify("清单保存失败，请检查设备存储空间");
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">为下一顿美味做准备</p>
          <h1>买菜清单</h1>
          <p className="page-description">想吃的菜选好了，带上清单去买菜。</p>
        </div>
        <button className="btn primary" onClick={openSelection}>
          <Plus size={17} />
          选择菜谱
        </button>
      </div>
      {items.length ? (
        <>
          <div className="shopping-summary panel">
            <div className="shopping-summary-icon">
              <ShoppingBasket size={28} />
            </div>
            <div>
              <h2>离一顿好饭，又近了一点</h2>
              <p>
                来自{" "}
                {
                  state?.recipeIds.filter((id) =>
                    recipes.some((r) => r.id === id),
                  ).length
                }{" "}
                道菜谱 · 已买齐 {bought} / {items.length} 项
              </p>
            </div>
            <span className="shopping-progress-number">
              {Math.round((bought / items.length) * 100)}
              <small>%</small>
            </span>
            <div className="progress-bar">
              <span style={{ width: `${(bought / items.length) * 100}%` }} />
            </div>
          </div>
          <div className="selected-recipes">
            {recipes
              .filter((r) => state?.recipeIds.includes(r.id))
              .map((r) => (
                <span key={r.id}>{r.title}</span>
              ))}
          </div>
          <div className="section-heading shopping-list-heading">
            <h2>
              要买这些 <span className="count-badge">{items.length}</span>
            </h2>
            <button
              className="text-button"
              disabled={!bought}
              onClick={async () => {
                try {
                  if (state)
                    await db.shopping.put({
                      ...state,
                      items: items.map((i) => ({ ...i, checked: false })),
                      updatedAt: Date.now(),
                    });
                } catch {
                  notify("重置失败，请重试");
                }
              }}
            >
              <RotateCcw size={14} />
              重置勾选
            </button>
          </div>
          <div className="shopping-items panel">
            {[...items]
              .sort((a, b) => Number(a.checked) - Number(b.checked))
              .map((i) => (
                <label
                  className={`shopping-item ${i.checked ? "checked" : ""}`}
                  key={i.id}
                >
                  <input
                    type="checkbox"
                    checked={i.checked}
                    onChange={() => toggle(i.id)}
                  />
                  <span className="custom-check">
                    <Check size={14} />
                  </span>
                  <span className="shopping-item-name">
                    <strong>{i.name}</strong>
                    <small>{i.recipes.join(" · ")}</small>
                  </span>
                  <span className="shopping-item-amount">
                    {i.amount || "用量待补充"}
                    {i.unit}
                  </span>
                </label>
              ))}
          </div>
          {bought === items.length && (
            <div className="shopping-complete">
              <CheckCheck size={20} />
              食材都买齐啦，回家做顿好饭吧。
            </div>
          )}
          <p className="field-help shopping-help">
            同名食材按兼容单位合并（如千克与克）。不同单位、范围和不确定用量会保留，不猜测换算。
          </p>
        </>
      ) : (
        <EmptyState
          title="一份清单，一顿好饭"
          description="选择今天想做的菜，自动合并食材，买菜时不再遗漏。"
          action="选择菜谱"
          onAction={openSelection}
        />
      )}
      {selecting && (
        <Modal
          title="今天想做哪几道？"
          onClose={() => {
            if (!busy) setSelecting(false);
          }}
        >
          <div className="selection-modal-body">
            {recipes.length ? (
              <>
                <p className="muted">选好菜谱后，将生成一份合并的买菜清单。</p>
                <div className="recipe-selection-list">
                  {recipes.map((r) => (
                    <label
                      key={r.id}
                      className={`recipe-selection ${selection.includes(r.id) ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selection.includes(r.id)}
                        onChange={() =>
                          setSelection((s) =>
                            s.includes(r.id)
                              ? s.filter((id) => id !== r.id)
                              : [...s, r.id],
                          )
                        }
                      />
                      <RecipeImage recipe={r} />
                      <span>
                        <strong>{r.title}</strong>
                        <small>
                          {r.ingredients.length} 种食材 · {r.category}
                        </small>
                      </span>
                      <span className="custom-check">
                        <Check size={13} />
                      </span>
                    </label>
                  ))}
                </div>
                <div className="editor-footer">
                  <span className="muted">已选 {selection.length} 道</span>
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !selection.length &&
                        items.length &&
                        !window.confirm(
                          "没有选择菜谱，将清空当前清单，继续吗？",
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        const count = await saveShoppingSelection(
                          selection,
                          recipes,
                        );
                        setSelecting(false);
                        notify(
                          count ? `已生成 ${count} 项买菜清单` : "清单已清空",
                        );
                      } catch {
                        notify("生成失败，请重试");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "正在整理…" : "生成买菜清单"}
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                title="先收藏一道喜欢的菜"
                description="有了菜谱，就能为你整理食材清单。"
                action="去看菜谱"
                onAction={() => {
                  setSelecting(false);
                  onLibrary();
                }}
              />
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
