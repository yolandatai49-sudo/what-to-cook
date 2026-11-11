import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ClipboardPaste,
  FileText,
  Link2,
  PencilLine,
  ShieldCheck,
} from "lucide-react";
import { draftFromText, extractSourceUrl, importUrl } from "../lib/importer";
import { newRecipe } from "../lib/recipes";
import type { Recipe } from "../types";

export function ImportPage({ onDraft }: { onDraft: (r: Recipe) => void }) {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const read = async () => {
    setError("");
    setBusy(true);
    controller.current = new AbortController();
    try {
      const recipe = await importUrl(url, controller.current.signal);
      if (!controller.current.signal.aborted) onDraft(recipe);
    } catch (e) {
      if (!controller.current.signal.aborted)
        setError(e instanceof Error ? e.message : "读取失败，请手动填写");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">留住美味灵感</p>
          <h1>收藏菜谱</h1>
          <p className="page-description">遇见喜欢的味道，先收藏，再慢慢做。</p>
        </div>
      </div>
      <div className="import-layout">
        <div className="panel import-panel">
          <div className="panel-icon">
            <Link2 size={24} />
          </div>
          <h2>把链接变成你的菜谱</h2>
          <p className="muted">来自小红书、烹饪网站，或任何让你心动的分享。</p>
          <label className="field">
            粘贴菜谱链接
            <textarea
              rows={3}
              placeholder="粘贴完整网址，也可以粘贴带链接的分享文字…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
          </label>
          <button
            className="btn primary full-width"
            onClick={read}
            disabled={busy || !url.trim()}
          >
            <Link2 size={17} />
            {busy ? "正在尝试读取…" : "尝试读取链接"}
            <ArrowRight size={16} />
          </button>
          {error && (
            <div className="notice warning" role="status">
              {error}
            </div>
          )}
          <div className="import-divider">
            <span />
            或粘贴原文
            <span />
          </div>
          <label className="field">
            笔记 / 菜谱原文
            <textarea
              rows={8}
              placeholder={
                "例如：\n番茄炒蛋\n食材：\n番茄 2 个\n鸡蛋 3 个\n步骤：\n1. 番茄切块，鸡蛋打散\n2. 炒熟鸡蛋后加入番茄"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <p className="field-help">
            仅整理明确标注的「食材」「步骤」段落。原文完整保存在笔记中，不补写缺失内容。
          </p>
          <button
            className="btn secondary full-width"
            disabled={!text.trim() || busy}
            onClick={() => onDraft(draftFromText(text, extractSourceUrl(url)))}
          >
            <ClipboardPaste size={17} />
            整理为草稿，检查后收藏
          </button>
          <button
            className="text-button manual-entry"
            disabled={busy}
            onClick={() =>
              onDraft({ ...newRecipe(), sourceUrl: extractSourceUrl(url) })
            }
          >
            <PencilLine size={16} />
            直接手动填写
          </button>
        </div>
        <aside className="import-aside">
          <div className="panel">
            <BookOpen size={26} strokeWidth={1.4} />
            <h3>你的灵感，值得好好保存</h3>
            <ol className="import-steps">
              <li>
                <span>1</span>
                <div>
                  <strong>粘贴链接或原文</strong>
                  <p>保留菜谱最初的出处</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>检查并补充细节</strong>
                  <p>食材、用量、步骤，由你确认</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>收进你的私人菜谱本</strong>
                  <p>下次打开，就可以开始做饭</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="soft-info">
            <ShieldCheck size={22} />
            <div>
              <strong>只读取公开、允许访问的内容</strong>
              <p>
                部分网站限制浏览器跨域读取，小红书也可能需要登录。遇到这些情况，请粘贴原文或手动填写。
              </p>
            </div>
          </div>
          <div className="soft-info">
            <FileText size={22} />
            <div>
              <strong>每次保存前，都由你确认</strong>
              <p>
                支持 Schema.org Recipe
                结构化数据。没有读取到的内容不会自动编造。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
