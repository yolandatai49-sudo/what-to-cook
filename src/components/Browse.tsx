import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  ChefHat,
  Clock3,
  Heart,
  Plus,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Sprout,
} from "lucide-react";
import type { Recipe } from "../types";
import { CategoryFilter, EmptyState, RecipeCard, RecipeImage } from "./ui";

type Props = {
  recipes: Recipe[];
  onOpen: (id: string) => void;
  onFavorite: (r: Recipe) => void;
  onAdd: () => void;
};
export function Home({
  recipes,
  onOpen,
  onFavorite,
  onAdd,
  onLibrary,
  notify,
}: Props & { onLibrary: () => void; notify: (s: string) => void }) {
  const [category, setCategory] = useState("全部");
  const [choice, setChoice] = useState(() =>
    recipes.length
      ? recipes[crypto.getRandomValues(new Uint32Array(1))[0] % recipes.length]
          .id
      : "",
  );
  const [chosen, setChosen] = useState(false);
  const [turn, setTurn] = useState(0);
  const pool = recipes.filter(
    (r) => category === "全部" || r.category === category,
  );
  const current = pool.find((r) => r.id === choice) || pool[0];
  const choose = () => {
    const choices = pool.filter((r) => r.id !== current?.id);
    if (!choices.length) {
      if (pool.length) notify("这个分类目前只有一道菜，也很值得一试");
      return;
    }
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    setChoice(choices[array[0] % choices.length].id);
    setChosen(true);
    setTurn((v) => v + 1);
  };
  return (
    <>
      <div className="page-heading home-heading">
        <div>
          <p className="eyebrow">
            <span /> 你的小小厨房 · 今日灵感
          </p>
          <h1>
            今天吃什么<span className="title-dot">？</span>
          </h1>
          <p className="page-description">
            把选择交给我们，把好心情留给一餐一饭。
          </p>
        </div>
        <div className="heading-illustration" aria-hidden="true">
          <Sprout size={62} strokeWidth={1.1} />
          <span>好好吃饭，慢慢生活</span>
        </div>
      </div>
      <div className="selection-toolbar">
        <div className="section-caption">
          <SlidersHorizontal size={15} />
          <span>今天想吃哪一类？</span>
        </div>
        <CategoryFilter
          value={category}
          onChange={(c) => {
            setCategory(c);
            setChosen(false);
          }}
        />
      </div>
      {current ? (
        <section className="daily-card" key={turn} aria-label="今日推荐">
          <div className="daily-image">
            <RecipeImage recipe={current} />
            <span className="image-badge">
              <Sparkles size={14} />
              今日的美味灵感
            </span>
            <button
              className={`favorite-button ${current.favorite ? "is-favorite" : ""}`}
              aria-label={
                current.favorite ? "取消收藏推荐菜谱" : "收藏推荐菜谱"
              }
              aria-pressed={current.favorite}
              onClick={() => onFavorite(current)}
            >
              <Heart
                size={20}
                fill={current.favorite ? "currentColor" : "none"}
              />
            </button>
            <div className="photo-caption">
              <span>用心做的每一餐</span>
              <span>一餐一饭，皆是生活</span>
            </div>
          </div>
          <div className="daily-content">
            <div className="recommendation-label">
              <span />
              今天，不妨试试这道
            </div>
            <h2>{current.title}</h2>
            <div className="daily-meta">
              <span className="tag">{current.category}</span>
              <span>
                <Clock3 size={16} />
                {current.minutes ? `${current.minutes} 分钟` : "用时待补充"}
              </span>
              <span>
                <ChefHat size={17} />
                {current.ingredients.length} 种食材
              </span>
            </div>
            <div className="daily-divider" />
            <p className="ingredient-caption">准备这些，就能开饭</p>
            <div className="ingredient-chips">
              {current.ingredients.slice(0, 6).map((i, n) => (
                <span key={n}>{i.name}</span>
              ))}
              {current.ingredients.length > 6 && (
                <span>+{current.ingredients.length - 6}</span>
              )}
              {!current.ingredients.length && <span>食材待补充</span>}
            </div>
            <div className="daily-actions">
              <button className="btn primary" onClick={choose}>
                <Shuffle size={17} />
                {chosen ? "再换一道" : "帮我选一道"}
              </button>
              <button
                className="btn secondary"
                onClick={() => onOpen(current.id)}
              >
                查看做法
                <ArrowRight size={16} />
              </button>
            </div>
            <p className="daily-footnote">
              {pool.length > 1
                ? `从 ${pool.length} 道${category === "全部" ? "私藏美味" : category}里，为你挑选一份小期待`
                : "这是这个分类的唯一一道菜，去收藏更多美味吧"}
            </p>
          </div>
        </section>
      ) : (
        <EmptyState
          title="这类美味，还等你来收藏"
          description="先添加一道喜欢的菜，下次就不用为吃什么发愁。"
          action="添加菜谱"
          onAction={onAdd}
        />
      )}
      <div className="cozy-note">
        <span className="cozy-note-icon">
          <Sprout size={20} />
        </span>
        <p>生活的温柔，藏在认真做的每一顿饭里。</p>
        <span className="note-line" />
        <span className="note-small">给自己，好好做顿饭</span>
      </div>
      <section className="inspiration-section">
        <div className="section-heading">
          <div>
            <h2>
              从收藏里，找点灵感
              <span className="count-badge">{recipes.length}</span>
            </h2>
            <p>喜欢的味道，都在这里等你</p>
          </div>
          <button className="text-button" onClick={onLibrary}>
            全部菜谱
            <ArrowRight size={16} />
          </button>
        </div>
        {recipes.length ? (
          <div className="recipe-grid home-grid">
            {recipes.slice(0, 4).map((r) => (
              <RecipeCard
                recipe={r}
                key={r.id}
                onOpen={() => onOpen(r.id)}
                onFavorite={() => onFavorite(r)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="收藏你的第一道菜"
            description="一份菜谱，就是一份对生活的小期待。"
            action="添加菜谱"
            onAction={onAdd}
          />
        )}
      </section>
      <div className="home-footer">
        <span>一间小厨房 · 一份热爱</span>
        <span>
          <BookOpen size={13} />
          你的私人菜谱本
        </span>
      </div>
    </>
  );
}

export function Library({ recipes, onOpen, onFavorite, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("全部");
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState("new");
  const filtered = recipes
    .filter(
      (r) =>
        (category === "全部" || r.category === category) &&
        (!favorites || r.favorite) &&
        r.title.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "time"
        ? (a.minutes ?? Infinity) - (b.minutes ?? Infinity)
        : b.createdAt - a.createdAt,
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">收好每一份喜欢</p>
          <h1>我的菜谱</h1>
          <p className="page-description">收好每一份喜欢，慢慢做给自己吃。</p>
        </div>
        <button className="btn primary" onClick={onAdd}>
          <Plus size={18} />
          添加菜谱
        </button>
      </div>
      <div className="library-search">
        <label className="search-field">
          <Search size={19} />
          <input
            placeholder="搜索想吃的菜…"
            aria-label="搜索菜谱名称"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button
          className={`btn ${favorites ? "primary" : "secondary"}`}
          aria-pressed={favorites}
          onClick={() => setFavorites((v) => !v)}
        >
          <Heart size={17} fill={favorites ? "currentColor" : "none"} />
          只看收藏
        </button>
      </div>
      <CategoryFilter value={category} onChange={setCategory} />
      <div className="library-summary">
        <span>
          共 <strong>{filtered.length}</strong> 道菜谱
        </span>
        <label className="sort-label">
          <ArrowDown size={14} />
          <select
            aria-label="排序方式"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="new">最近添加</option>
            <option value="time">用时最短</option>
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="recipe-grid">
          {filtered.map((r) => (
            <RecipeCard
              recipe={r}
              key={r.id}
              onOpen={() => onOpen(r.id)}
              onFavorite={() => onFavorite(r)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={search ? "还没找到这道菜" : "这里还没有菜谱"}
          description={
            search
              ? "换个关键词，或清除筛选再试试。"
              : "把喜欢的菜收藏起来，下次想吃就能找到。"
          }
          action="添加菜谱"
          onAction={onAdd}
        />
      )}
    </>
  );
}
