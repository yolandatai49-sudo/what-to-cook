import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  CheckCircle2,
  Database,
  Heart,
  Info,
  Share,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { db, exportBackup, importBackup, parseBackup } from "../lib/db";
import type { Backup, Recipe } from "../types";
import { Modal } from "./ui";

export function Settings({
  recipes,
  notify,
}: {
  recipes: Recipe[];
  notify: (s: string) => void;
}) {
  const [pending, setPending] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [install, setInstall] = useState(false);
  const [conflicts, setConflicts] = useState(0);
  const download = async () => {
    setBusy(true);
    try {
      const backup = await exportBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `今天吃什么-备份-${new Date().toLocaleDateString("sv-SE")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      notify("备份已准备好，请保存到「文件」中");
    } catch {
      notify("备份导出失败，请重试");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">照顾好你的私人厨房</p>
          <h1>我的厨房</h1>
          <p className="page-description">
            把喜欢的菜收好，把下厨的日子慢慢过。
          </p>
        </div>
      </div>
      <div className="kitchen-stats">
        <div>
          <BookOpen size={23} />
          <strong>{recipes.length}</strong>
          <span>私藏菜谱</span>
        </div>
        <div>
          <Heart size={23} />
          <strong>{recipes.filter((r) => r.favorite).length}</strong>
          <span>心头好</span>
        </div>
        <div>
          <Database size={23} />
          <strong>本机</strong>
          <span>你的数据，只属于你</span>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="panel-heading">
            <Database size={21} />
            <h2>备份与恢复</h2>
          </div>
          <p className="muted">
            菜谱、照片与买菜清单保存在当前设备。定期导出一份备份，让喜欢的味道一直都在。
          </p>
          <div className="settings-action">
            <div>
              <strong>导出厨房备份</strong>
              <p>包含全部菜谱、照片和当前清单的 JSON 文件</p>
            </div>
            <button
              className="btn secondary"
              disabled={busy}
              onClick={download}
            >
              <ArrowDownToLine size={17} />
              导出
            </button>
          </div>
          <div className="settings-action">
            <div>
              <strong>从备份恢复</strong>
              <p>仅添加新菜谱，已有编号的菜谱会跳过</p>
            </div>
            <label className={`btn secondary ${busy ? "disabled" : ""}`}>
              <ArrowUpFromLine size={17} />
              导入
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  try {
                    if (file.size > 50 * 1024 * 1024)
                      throw new Error("备份文件请小于 50 MB");
                    const parsed = parseBackup(await file.text());
                    const existing = new Set(
                      await db.recipes.toCollection().primaryKeys(),
                    );
                    setConflicts(
                      parsed.recipes.filter((r) => existing.has(r.id)).length,
                    );
                    setPending(parsed);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "无法读取备份");
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <div className="soft-info compact">
            <ShieldCheck size={19} />
            <p>
              不需要账号，也没有云端同步。清除浏览器数据、换设备或更换网址后，需要用备份恢复菜谱。
            </p>
          </div>
        </section>
        <section className="panel settings-panel">
          <div className="panel-heading">
            <Smartphone size={21} />
            <h2>把厨房装进口袋</h2>
          </div>
          <p className="muted">
            添加到 iPhone 主屏幕，像打开一个 App 一样，随时找到你的菜谱。
          </p>
          <div className="install-visual">
            <div className="mini-app-icon">
              <img
                src={`${import.meta.env.BASE_URL}icons/icon-192.png`}
                alt="今天吃什么应用图标"
              />
            </div>
            <span>今天吃什么</span>
          </div>
          <button
            className="btn primary full-width"
            onClick={() => setInstall(true)}
          >
            <Smartphone size={17} />
            查看 iPhone 安装方法
          </button>
          <p className="field-help">首次联网打开后，已保存的菜谱可离线使用。</p>
        </section>
      </div>
      <section className="about-note">
        <span>
          <Heart size={16} />
          今天吃什么 · 第一版
        </span>
        <p>不急着成为大厨，先好好吃一顿饭。</p>
      </section>
      {pending && (
        <Modal
          title="确认恢复备份"
          onClose={() => {
            if (!busy) setPending(null);
          }}
        >
          <div className="selection-modal-body">
            <div className="notice">
              <strong>发现 {pending.recipes.length} 道菜谱</strong>
              <p>
                将添加 {pending.recipes.length - conflicts} 道新菜谱，跳过{" "}
                {conflicts} 道已有菜谱。你当前的菜谱内容不会被覆盖。
              </p>
            </div>
            <p className="field-help">
              如果当前已有买菜清单，将保留当前清单；否则恢复备份中的清单。
            </p>
            <div className="backup-preview">
              {pending.recipes.slice(0, 8).map((r) => (
                <span key={r.id}>{r.title}</span>
              ))}
              {pending.recipes.length > 8 && (
                <span>以及另外 {pending.recipes.length - 8} 道…</span>
              )}
            </div>
            <div className="editor-footer">
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => setPending(null)}
              >
                取消
              </button>
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await importBackup(pending);
                    setPending(null);
                    notify(
                      `恢复完成：新增 ${result.added} 道，跳过 ${result.skipped} 道`,
                    );
                  } catch {
                    notify("恢复失败，未写入任何数据，请检查存储空间");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "正在恢复…" : "确认导入新菜谱"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {install && (
        <Modal title="在 iPhone 上安装" onClose={() => setInstall(false)}>
          <div className="selection-modal-body">
            <ol className="install-steps">
              <li>
                <span>1</span>
                <div>
                  <strong>用 Safari 打开正式网址</strong>
                  <p>
                    发布到 GitHub Pages 后，在 iPhone 的 Safari 中打开 HTTPS
                    网站。
                  </p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>
                    轻点「分享」
                    <Share size={16} />
                  </strong>
                  <p>
                    在 Safari 菜单中选择「添加到主屏幕」，确认名称后点「添加」。
                  </p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>从主屏幕打开，开始收藏</strong>
                  <p>
                    首次联网打开，等待离线资源就绪，再尝试开启飞行模式查看菜谱。
                  </p>
                </div>
              </li>
            </ol>
            <div className="notice">
              <Info size={17} />
              如果 Safari 和主屏幕 App
              中的菜谱不同，可通过导出、导入备份转移。无需 App Store
              或开发者订阅。
            </div>
            <button
              className="btn primary full-width"
              onClick={() => setInstall(false)}
            >
              <CheckCircle2 size={17} />
              知道了
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
