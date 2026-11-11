import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChefHat, Clock3, Heart, Leaf, Plus, X } from "lucide-react";
import type { Recipe } from "../types";
import { CATEGORIES } from "../types";
import { imageSource } from "../lib/recipes";

export function RecipeImage({
  recipe,
  className = "",
}: {
  recipe: Pick<Recipe, "image" | "title">;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [recipe.image]);
  return recipe.image && !failed ? (
    <img
      className={className}
      src={imageSource(recipe.image)}
      alt={recipe.title}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`image-fallback ${className}`}>
      <ChefHat size={42} />
      <span>把喜欢的味道，留在这里</span>
    </div>
  );
}
export function CategoryFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="category-scroll" aria-label="按分类筛选">
      {["全部", ...CATEGORIES].map((c) => (
        <button
          key={c}
          className={`category-pill ${value === c ? "active" : ""}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
        >
          {c === "全部" && <Leaf size={14} />} {c === "全部" ? "全部菜谱" : c}
        </button>
      ))}
    </div>
  );
}
export function RecipeCard({
  recipe,
  onOpen,
  onFavorite,
}: {
  recipe: Recipe;
  onOpen: () => void;
  onFavorite: () => void;
}) {
  return (
    <article className="recipe-card">
      <div className="card-image-wrap">
        <button
          className="image-button"
          onClick={onOpen}
          aria-label={`查看${recipe.title}`}
        >
          <RecipeImage recipe={recipe} />
        </button>
        <button
          className={`favorite-button ${recipe.favorite ? "is-favorite" : ""}`}
          aria-label={
            recipe.favorite ? `取消收藏${recipe.title}` : `收藏${recipe.title}`
          }
          aria-pressed={recipe.favorite}
          onClick={onFavorite}
        >
          <Heart size={18} fill={recipe.favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="card-body">
        <span className="mini-category">{recipe.category}</span>
        <button className="card-title" onClick={onOpen}>
          {recipe.title}
        </button>
        <div className="card-meta">
          <span>
            <Clock3 size={13} />
            {recipe.minutes ? `${recipe.minutes} 分钟` : "用时待补充"}
          </span>
          <span>{recipe.ingredients.length} 种食材</span>
        </div>
      </div>
    </article>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ChefHat size={36} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="btn primary" onClick={onAction}>
          <Plus size={17} />
          {action}
        </button>
      )}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = ref.current;
    dialog?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === "Tab" && dialog) {
        const elements = [
          ...dialog.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
          ),
        ].filter((el) => el.offsetParent !== null);
        const first = elements[0],
          last = elements[elements.length - 1];
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === dialog)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="关闭" onClick={onClose}>
            <X size={22} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
