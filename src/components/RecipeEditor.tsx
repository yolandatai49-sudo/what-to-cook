import { useCallback, useState, type FormEvent } from "react";
import { ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { CATEGORIES, type Recipe } from "../types";
import { imageFileToDataUrl, safeUrl } from "../lib/recipes";
import { putRecipe } from "../lib/db";
import { Modal, RecipeImage } from "./ui";

export function RecipeEditor({
  initial,
  onClose,
  onSaved,
  notify,
  imported = false,
}: {
  initial: Recipe;
  onClose: () => void;
  onSaved: (r: Recipe) => void;
  notify: (s: string) => void;
  imported?: boolean;
}) {
  const [draft, setDraft] = useState<Recipe>(structuredClone(initial));
  const [steps, setSteps] = useState(initial.steps.join("\n"));
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const patch = (p: Partial<Recipe>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, ...p }));
  };
  const close = useCallback(() => {
    if (saving || processingImage) return;
    if (!dirty || window.confirm("尚未保存，确定放弃本次修改吗？")) onClose();
  }, [dirty, onClose, saving, processingImage]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (draft.sourceUrl && !safeUrl(draft.sourceUrl)) {
      setError("原链接必须以 http:// 或 https:// 开头");
      return;
    }
    setSaving(true);
    try {
      const recipe = {
        ...draft,
        title: draft.title.trim(),
        ingredients: draft.ingredients.filter((i) => i.name.trim()),
        steps: steps
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        updatedAt: Date.now(),
      };
      await putRecipe(recipe);
      notify("菜谱已保存，下一顿有着落了");
      onSaved(recipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请检查设备存储空间");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={
        imported ? "确认收藏菜谱" : initial.title ? "编辑菜谱" : "添加新菜谱"
      }
      onClose={close}
      wide
    >
      <form onSubmit={save} className="editor-form">
        {imported && (
          <div className="notice">
            请核对食材、用量和步骤。未读取到的信息保持为空，你可以随时补充。
          </div>
        )}
        <div className="editor-photo">
          <RecipeImage recipe={draft} />
          <div>
            <label
              className={`btn secondary ${processingImage ? "disabled" : ""}`}
            >
              <ImagePlus size={17} />
              {processingImage ? "正在处理…" : "上传菜品照片"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={processingImage || saving}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setProcessingImage(true);
                  try {
                    patch({ image: await imageFileToDataUrl(file) });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "图片处理失败");
                  } finally {
                    setProcessingImage(false);
                  }
                }}
              />
            </label>
            <p>照片压缩后保存在本机，离线也能查看</p>
            {draft.image && (
              <button
                type="button"
                className="text-button"
                onClick={() => patch({ image: "" })}
              >
                <X size={13} />
                移除照片
              </button>
            )}
          </div>
        </div>
        {draft.image.startsWith("http") && (
          <p className="field-help">
            此菜谱使用网络图片，离线可能无法显示。上传照片即可保存在本机。
          </p>
        )}
        <label className="field">
          菜谱名称 <span className="required">*</span>
          <input
            required
            maxLength={200}
            placeholder="比如：妈妈的番茄炒蛋"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            分类
            <select
              value={draft.category}
              onChange={(e) =>
                patch({ category: e.target.value as Recipe["category"] })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            烹饪时间（分钟）
            <input
              type="number"
              min="1"
              max="10080"
              placeholder="暂不填写"
              value={draft.minutes ?? ""}
              onChange={(e) =>
                patch({
                  minutes: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </label>
        </div>
        <div className="editor-section-heading">
          <h3>食材与用量</h3>
          <span>未知用量可以留空</span>
        </div>
        <div className="ingredient-labels">
          <span>食材名称</span>
          <span>用量</span>
          <span>单位</span>
          <span />
        </div>
        {draft.ingredients.map((i, index) => (
          <div className="ingredient-inputs" key={index}>
            <input
              aria-label={`食材 ${index + 1} 名称`}
              placeholder="如：鸡蛋"
              maxLength={500}
              value={i.name}
              onChange={(e) =>
                patch({
                  ingredients: draft.ingredients.map((v, n) =>
                    n === index ? { ...v, name: e.target.value } : v,
                  ),
                })
              }
            />
            <input
              aria-label={`食材 ${index + 1} 用量`}
              placeholder="2 / 适量"
              maxLength={100}
              value={i.amount}
              onChange={(e) =>
                patch({
                  ingredients: draft.ingredients.map((v, n) =>
                    n === index ? { ...v, amount: e.target.value } : v,
                  ),
                })
              }
            />
            <input
              aria-label={`食材 ${index + 1} 单位`}
              placeholder="个"
              maxLength={100}
              value={i.unit}
              onChange={(e) =>
                patch({
                  ingredients: draft.ingredients.map((v, n) =>
                    n === index ? { ...v, unit: e.target.value } : v,
                  ),
                })
              }
            />
            <button
              type="button"
              className="icon-button"
              aria-label={`移除食材 ${index + 1}`}
              onClick={() =>
                patch({
                  ingredients: draft.ingredients.filter((_, n) => n !== index),
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="add-row"
          disabled={draft.ingredients.length >= 300}
          onClick={() =>
            patch({
              ingredients: [
                ...draft.ingredients,
                { name: "", amount: "", unit: "" },
              ],
            })
          }
        >
          <Plus size={16} />
          添加食材
        </button>
        <label className="field">
          烹饪步骤<span className="field-help">每行一个步骤，将按顺序编号</span>
          <textarea
            rows={6}
            placeholder={"洗净食材，切好备用\n热锅倒油，放入食材翻炒"}
            value={steps}
            onChange={(e) => {
              setDirty(true);
              setSteps(e.target.value);
            }}
          />
        </label>
        <label className="field">
          原始链接
          <input
            type="url"
            maxLength={4000}
            placeholder="https://…（可选）"
            value={draft.sourceUrl}
            onChange={(e) => patch({ sourceUrl: e.target.value })}
          />
        </label>
        <label className="field">
          我的笔记
          <textarea
            rows={4}
            maxLength={100000}
            placeholder="记下自己的口味调整、原文或下次想试的小变化…"
            value={draft.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
        </label>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <div className="editor-footer">
          <button
            type="button"
            className="btn secondary"
            onClick={close}
            disabled={saving || processingImage}
          >
            取消
          </button>
          <button
            className="btn primary"
            type="submit"
            disabled={saving || processingImage}
          >
            <Save size={17} />
            {saving ? "正在保存…" : "保存菜谱"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
