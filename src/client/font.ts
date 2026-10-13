const PLUGIN_ID = "@fang2hou/dsh-locale-ja";
const TAG_ID = `${PLUGIN_ID}/japanese-font.css`;

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", ' +
  '"Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", "Meiryo", ' +
  '"Noto Sans CJK JP", "Noto Sans JP", sans-serif';

const CODE_STACK =
  "'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', " +
  "Menlo, Courier, 'Yu Gothic UI', 'Meiryo', 'Noto Sans CJK JP'";

// Body-local theme tokens defeat root inheritance. Zero specificity lets
// explicit !important font settings win even when this tag is reinserted.
const CSS =
  ":where(:root,body){" +
  `--dsw-font-family:${FONT_STACK} !important;` +
  "--dsw-font-family-brand:'Montserrat',var(--dsw-font-family) !important;" +
  `--ds-font-family-code:${CODE_STACK} !important;` +
  "}";

export interface FontStylesheet {
  sync: (japanese: boolean) => void;
  dispose: () => void;
}

export function createFontStylesheet(): FontStylesheet {
  let tag: HTMLStyleElement | null = null;

  const remove = (): void => {
    tag?.remove();
    tag = null;
  };

  return {
    sync(japanese: boolean): void {
      if (!japanese) {
        remove();
        return;
      }
      // No document while the client tree boots outside a browser.
      if (tag !== null || typeof document === "undefined") return;
      tag = document.createElement("style");
      tag.dataset.plugin = PLUGIN_ID;
      tag.dataset.pluginCss = TAG_ID;
      tag.textContent = CSS;
      document.head.append(tag);
    },
    dispose: remove,
  };
}
