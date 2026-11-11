import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  ExternalLink,
  Heart,
  NotebookPen,
  PencilLine,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import type { Recipe } from "../types";
import { putRecipe } from "../lib/db";
import { safeUrl } from "../lib/recipes";
import { RecipeImage } from "./ui";

export function Detail({
  recipe,
  onBack,
  onEdit,
  onDelete,
  onFavorite,
  onShopping,
  notify,
}: {
  recipe: Recipe;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onShopping: () => void;
  notify: (s: string) => void;
}) {
  const [checked, setChecked] = useState<number[]>([]);
  const [notes, setNotes] = useState(recipe.notes);
  const [saving, setSaving] = useState(false);
  const ingredientSignature = JSON.stringify(recipe.ingredients);
  useEffect(() => setNotes(recipe.notes), [recipe.notes]);
  useEffect(() => setChecked([]), [ingredientSignature]);
  return (
    <>
      <div className="detail-top">
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={17} />
          返回菜谱
        </button>
        <div className="detail-actions">
          <button className="btn secondary small" onClick={onEdit}>
            <PencilLine size={15} />
            编辑
          </button>
          <button
            className="icon-button danger"
            aria-label="删除菜谱"
            onClick={onDelete}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <article className="detail-panel">
        <div className="detail-hero">
          <div className="detail-photo">
            <RecipeImage recipe={recipe} />
          </div>
          <div className="detail-intro">
            <span className="eyebrow">一份家的味道</span>
            <h1>{recipe.title}</h1>
            <div className="daily-meta">
              <span className="tag">{recipe.category}</span>
              <span>
                <Clock3 size={16} />
                {recipe.minutes ? `${recipe.minutes} 分钟` : "用时待补充"}
              </span>
            </div>
            <p className="detail-description">
              准备好食材，给自己一点下厨的时间。
            </p>
            <div className="detail-primary-actions">
              <button className="btn primary" onClick={onShopping}>
                <ShoppingBasket size={17} />
                加入买菜清单
              </button>
              <button
                className={`btn secondary ${recipe.favorite ? "is-favorite" : ""}`}
                onClick={onFavorite}
                aria-pressed={recipe.favorite}
              >
                <Heart
                  size={17}
                  fill={recipe.favorite ? "currentColor" : "none"}
                />
                {recipe.favorite ? "已收藏" : "收藏"}
              </button>
            </div>
            {safeUrl(recipe.sourceUrl) && (
              <a
                className="source-link"
                href={safeUrl(recipe.sourceUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                查看原始菜谱
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
        <div className="detail-body">
          <section className="detail-ingredients">
            <div className="section-heading">
              <h2>准备食材</h2>
              <span className="muted small-text">
                {checked.length} / {recipe.ingredients.length}
              </span>
            </div>
            <p className="field-help">准备好了就打个勾，做饭更从容。</p>
            {recipe.ingredients.length ? (
              <div className="ingredient-checklist">
                {recipe.ingredients.map((i, n) => (
                  <label
                    key={n}
                    className={`ingredient-check ${checked.includes(n) ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked.includes(n)}
                      onChange={() =>
                        setChecked((c) =>
                          c.includes(n) ? c.filter((v) => v !== n) : [...c, n],
                        )
                      }
                    />
                    <span className="custom-check">
                      <Check size={13} />
                    </span>
                    <span>{i.name}</span>
                    <span className="ingredient-amount">
                      {i.amount || "用量待补充"}
                      {i.unit}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="notice">食材尚未填写，点击「编辑」补充。</p>
            )}
          </section>
          <section className="detail-steps">
            <h2>开始做饭</h2>
            {recipe.steps.length ? (
              <ol className="cooking-steps">
                {recipe.steps.map((s, n) => (
                  <li key={n}>
                    <span>{String(n + 1).padStart(2, "0")}</span>
                    <p>{s}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="notice">步骤尚未填写，请参考原文并编辑补充。</p>
            )}
          </section>
        </div>
        <section className="detail-notes">
          <div className="section-heading">
            <h2>
              <NotebookPen size={20} />
              我的厨房笔记
            </h2>
            <button
              className="text-button"
              disabled={saving || notes === recipe.notes}
              onClick={async () => {
                setSaving(true);
                try {
                  await putRecipe({ ...recipe, notes });
                  notify("厨房笔记已保存");
                } catch (e) {
                  notify(e instanceof Error ? e.message : "保存失败");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "正在保存…" : "保存笔记"}
            </button>
          </div>
          <textarea
            aria-label="我的厨房笔记"
            maxLength={100000}
            rows={4}
            placeholder="今天少放一点盐，下次再试试加一把葱花…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>
      </article>
    </>
  );
}
