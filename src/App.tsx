import { useCallback, useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CookingPot,
  Heart,
  House,
  Leaf,
  Link2,
  Menu,
  Plus,
  Settings as SettingsIcon,
  ShoppingBasket,
  WifiOff,
  X,
} from "lucide-react";
import { db, initialize } from "./lib/db";
import { newRecipe } from "./lib/recipes";
import type { Page, Recipe } from "./types";
import { Home, Library } from "./components/Browse";
import { Detail } from "./components/Detail";
import { ImportPage } from "./components/ImportPage";
import { Shopping, saveShoppingSelection } from "./components/Shopping";
import { Settings } from "./components/Settings";
import { RecipeEditor } from "./components/RecipeEditor";
import { EmptyState } from "./components/ui";

const nav = [
  { id: "home", label: "今天吃什么", short: "今日", icon: House },
  { id: "recipes", label: "我的菜谱", short: "菜谱", icon: BookOpen },
  { id: "import", label: "收藏菜谱", short: "收藏", icon: Link2 },
  { id: "shopping", label: "买菜清单", short: "买菜", icon: ShoppingBasket },
  { id: "settings", label: "我的厨房", short: "我的", icon: SettingsIcon },
] as const;
const route = () => {
  try {
    return decodeURIComponent(window.location.hash.slice(1) || "home");
  } catch {
    return "home";
  }
};
export default function App() {
  const [path, setPath] = useState(route);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{
    recipe: Recipe;
    imported: boolean;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const recipes = useLiveQuery(
    () => db.recipes.orderBy("createdAt").reverse().toArray(),
    [],
    [],
  );
  const shopping = useLiveQuery(() => db.shopping.get("current"));
  const notify = useCallback((s: string) => setToast(s), []);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () => notify("离线资源暂未就绪，请联网刷新后重试"),
  });
  useEffect(() => {
    initialize()
      .then(() => setReady(true))
      .catch(() =>
        setError(
          "暂时无法使用本地数据库。请确认浏览器允许本地存储，并检查设备剩余空间。",
        ),
      );
  }, []);
  useEffect(() => {
    const change = () => {
      try {
        setPath(route());
      } catch {
        setPath("home");
      }
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener("online", yes);
    window.addEventListener("offline", no);
    return () => {
      window.removeEventListener("online", yes);
      window.removeEventListener("offline", no);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timeout);
  }, [toast]);
  const navigate = (page: string) => {
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const active = path.startsWith("recipe/")
    ? "recipes"
    : nav.some((n) => n.id === path)
      ? (path as Page)
      : "home";
  const recipeId = path.startsWith("recipe/") ? path.slice(7) : null;
  const recipe = recipes.find((r) => r.id === recipeId);
  const onFavorite = async (r: Recipe) => {
    try {
      await db.recipes.update(r.id, {
        favorite: !r.favorite,
        updatedAt: Date.now(),
      });
    } catch {
      notify("收藏状态保存失败，请重试");
    }
  };
  const onOpen = (id: string) => navigate(`recipe/${id}`);
  const onAdd = () => setEditor({ recipe: newRecipe(), imported: false });
  const closeEditor = useCallback(() => setEditor(null), []);
  const count = shopping?.items.filter((i) => !i.checked).length || 0;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <div className="brand-icon">
            <CookingPot size={28} strokeWidth={1.65} />
            <span className="brand-steam" />
          </div>
          <div>
            <strong>今天吃什么</strong>
            <span>你的私人菜谱本</span>
          </div>
        </a>
        <div className="sidebar-label">一日三餐，慢慢喜欢</div>
        <nav className="desktop-nav" aria-label="主导航">
          {nav.slice(0, 4).map((n) => (
            <a
              href={`#${n.id}`}
              key={n.id}
              className={active === n.id ? "active" : ""}
              aria-current={active === n.id ? "page" : undefined}
            >
              <n.icon size={20} strokeWidth={1.7} />
              <span>{n.label}</span>
              {n.id === "recipes" && <small>{recipes.length}</small>}
              {n.id === "shopping" && count > 0 && <small>{count}</small>}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Leaf size={25} strokeWidth={1.2} />
            <p>
              把日子过成
              <br />
              喜欢的味道。
            </p>
            <span>厨房里的小确幸</span>
          </div>
          <a
            className={`settings-nav ${active === "settings" ? "active" : ""}`}
            href="#settings"
          >
            <SettingsIcon size={19} />
            <span>我的厨房</span>
            <ChevronRight size={15} />
          </a>
          <span className="sidebar-local">
            <span />
            本地保存 · 安心收藏
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <a className="mobile-brand" href="#home">
            <CookingPot size={23} />
            <strong>今天吃什么</strong>
          </a>
          <div className="breadcrumb">
            <span>我的私人厨房</span>
            <ChevronRight size={13} />
            <strong>{nav.find((n) => n.id === active)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="date-label">
              {new Date().toLocaleDateString("zh-CN", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
            <span className={`local-status ${!online ? "offline" : ""}`}>
              {online ? <span /> : <WifiOff size={12} />}
              <span className="status-text">
                {online ? "好好吃饭，慢慢生活" : "正在离线使用"}
              </span>
            </span>
            <button
              className="topbar-avatar"
              aria-label="打开我的厨房"
              onClick={() => navigate("settings")}
            >
              <CookingPot size={19} />
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner">
            <WifiOff size={15} />
            已离线，保存在本机的菜谱和清单仍可使用
          </div>
        )}
        <main id="main-content" className="main-content">
          {error ? (
            <EmptyState
              title="暂时无法打开厨房"
              description={error}
              action="重新尝试"
              onAction={() => location.reload()}
            />
          ) : !ready ? (
            <div className="loading-state">
              <CookingPot size={35} />
              <p>正在打开你的小厨房…</p>
            </div>
          ) : recipeId ? (
            recipe ? (
              <Detail
                key={recipe.id}
                recipe={recipe}
                notify={notify}
                onBack={() => navigate("recipes")}
                onEdit={() => setEditor({ recipe, imported: false })}
                onFavorite={() => onFavorite(recipe)}
                onDelete={async () => {
                  if (
                    !window.confirm(
                      `确定删除「${recipe.title}」吗？此操作无法撤销。`,
                    )
                  )
                    return;
                  try {
                    await db.recipes.delete(recipe.id);
                    navigate("recipes");
                    notify(
                      "菜谱已删除，现有买菜清单会保留，重新选择菜谱后可更新",
                    );
                  } catch {
                    notify("删除失败，请重试");
                  }
                }}
                onShopping={async () => {
                  try {
                    const current = await db.shopping.get("current");
                    const ids = [
                      ...new Set([...(current?.recipeIds || []), recipe.id]),
                    ];
                    const count = await saveShoppingSelection(ids, recipes);
                    notify(
                      count
                        ? "食材已加入买菜清单"
                        : "这道菜还没有食材，请编辑补充",
                    );
                    if (count) navigate("shopping");
                  } catch {
                    notify("添加失败，请重试");
                  }
                }}
              />
            ) : (
              <EmptyState
                title="这道菜谱暂时找不到了"
                description="可能已被删除，回到菜谱本看看其他美味吧。"
                action="返回菜谱"
                onAction={() => navigate("recipes")}
              />
            )
          ) : active === "home" ? (
            <Home
              recipes={recipes}
              onOpen={onOpen}
              onFavorite={onFavorite}
              onAdd={onAdd}
              onLibrary={() => navigate("recipes")}
              notify={notify}
            />
          ) : active === "recipes" ? (
            <Library
              recipes={recipes}
              onOpen={onOpen}
              onFavorite={onFavorite}
              onAdd={onAdd}
            />
          ) : active === "import" ? (
            <ImportPage
              onDraft={(r) => setEditor({ recipe: r, imported: true })}
            />
          ) : active === "shopping" ? (
            <Shopping
              recipes={recipes}
              state={shopping}
              notify={notify}
              onLibrary={() => navigate("recipes")}
            />
          ) : (
            <Settings recipes={recipes} notify={notify} />
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="底部导航">
        {nav.map((n) => (
          <a
            href={`#${n.id}`}
            key={n.id}
            className={active === n.id ? "active" : ""}
            aria-current={active === n.id ? "page" : undefined}
          >
            <span>
              <n.icon size={21} strokeWidth={active === n.id ? 2 : 1.6} />
              {n.id === "shopping" && count > 0 && (
                <small>{count > 99 ? "99+" : count}</small>
              )}
            </span>
            {n.short}
          </a>
        ))}
      </nav>
      {editor && (
        <RecipeEditor
          key={editor.recipe.id}
          initial={editor.recipe}
          imported={editor.imported}
          onClose={closeEditor}
          onSaved={(r) => {
            setEditor(null);
            onOpen(r.id);
          }}
          notify={notify}
        />
      )}
      <div className="toast-area" aria-live="polite">
        {toast && (
          <div className="toast" role="status">
            <Check size={17} />
            {toast}
            <button aria-label="关闭提示" onClick={() => setToast("")}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
      {(needRefresh || offlineReady) && (
        <div className="pwa-prompt" role="status">
          <div>
            <strong>
              {needRefresh ? "厨房有新版本啦" : "你的厨房，离线也能打开了"}
            </strong>
            <p>
              {needRefresh
                ? "保存编辑后，更新即可使用最新版本。"
                : "菜谱和本机照片已为你妥善保存。"}
            </p>
          </div>
          {needRefresh && (
            <button
              className="btn primary small"
              onClick={() => {
                if (editor) {
                  notify("请先保存或关闭正在编辑的菜谱");
                  return;
                }
                void updateServiceWorker(true);
              }}
            >
              更新
            </button>
          )}
          <button
            className="icon-button"
            aria-label="关闭离线提示"
            onClick={() => {
              setOfflineReady(false);
              setNeedRefresh(false);
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
