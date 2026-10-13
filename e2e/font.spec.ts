import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const bundle = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
const FONT_TAG = 'style[data-plugin-css="@fang2hou/dsh-locale-ja/japanese-font.css"]';
const USER_CSS =
  ':root,body{--dsw-font-family:"User Sans",sans-serif !important;' +
  '--dsw-font-mono:"User Mono",monospace !important;' +
  '--ds-font-family-code:"User Mono",monospace !important;}';

interface FontWindow extends Window {
  __ModuleLoader__: {
    load(entry: {
      factory: (require: (id: string) => never) => { apply(ctx: unknown): void };
    }): void;
  };
  fontTest: {
    setLocale(id: string): void;
    dispose(): void;
  };
}

async function switchLocale(page: Page, id: string): Promise<void> {
  await page.evaluate((locale) => (window as unknown as FontWindow).fontTest.setLocale(locale), id);
}

async function fonts(page: Page): Promise<{ sans: string; brand: string; code: string }> {
  return page.evaluate(() => {
    const read = (id: string): string => {
      const element = document.getElementById(id);
      if (element === null) throw new Error(`Missing font probe: ${id}`);
      return getComputedStyle(element).fontFamily;
    };
    return { sans: read("sans"), brand: read("brand"), code: read("code") };
  });
}

async function addUserFonts(page: Page, css = USER_CSS): Promise<void> {
  await page.evaluate((text) => {
    const tag = document.createElement("style");
    tag.id = "user-fonts";
    tag.dataset.pluginCss = "dsh-ui-font/font-family.css";
    tag.textContent = text;
    document.head.append(tag);
  }, css);
}

test.beforeEach(async ({ page }) => {
  await page.setContent(
    '<body style="--dsw-font-family: Microsoft YaHei; --ds-font-family-code: Consolas, Microsoft YaHei; ' +
      "--dsw-font-family-brand: 'Montserrat',var(--dsw-font-family)\">" +
      '<p id="sans" style="font-family:var(--dsw-font-family)">UI</p>' +
      '<p id="brand" style="font-family:var(--dsw-font-family-brand)">Brand</p>' +
      '<code id="code" style="font-family:var(--ds-font-family-code)">Code</code></body>',
  );
  await page.evaluate(() => {
    let active = "en";
    const listeners = new Set<() => void>();
    const disposers: Array<() => void> = [];
    const fontWindow = window as unknown as FontWindow;
    fontWindow.fontTest = {
      setLocale(id) {
        active = id;
        for (const listener of listeners) listener();
      },
      dispose() {
        for (const dispose of disposers.splice(0).toReversed()) dispose();
      },
    };
    fontWindow["__ModuleLoader__"] = {
      load(entry) {
        const plugin = entry.factory((id) => {
          throw new Error(`Unexpected module dependency: ${id}`);
        });
        plugin.apply({
          locale: {
            register: () => () => {},
            addLanguage: () => () => {},
            getLocale: () => ({ active }),
            subscribe(listener: () => void) {
              listeners.add(listener);
              return () => listeners.delete(listener);
            },
          },
          effect(setup: () => () => void) {
            disposers.push(setup());
          },
        });
      },
    };
  });
  await page.addScriptTag({ content: bundle });
});

test("Japanese UI, brand and code faces replace body-local theme defaults and retract on teardown", async ({
  page,
}) => {
  const baseline = await fonts(page);
  await switchLocale(page, "ja");
  const japanese = await fonts(page);
  expect(japanese.sans).toContain("Yu Gothic");
  expect(japanese.sans).toContain("Noto Sans CJK JP");
  expect(japanese.brand).toContain("Montserrat");
  expect(japanese.brand).toContain("Yu Gothic");
  expect(japanese.code).toContain("Consolas");
  expect(japanese.code).toContain("Meiryo");
  for (const value of Object.values(japanese)) expect(value).not.toContain("Microsoft YaHei");
  await switchLocale(page, "ja");
  await expect(page.locator(FONT_TAG)).toHaveCount(1);
  await switchLocale(page, "en");
  expect(await fonts(page)).toEqual(baseline);
  await switchLocale(page, "ja");
  await page.evaluate(() => (window as unknown as FontWindow).fontTest.dispose());
  await expect(page.locator(FONT_TAG)).toHaveCount(0);
  expect(await fonts(page)).toEqual(baseline);
});

for (const order of ["user-first", "locale-first"] as const) {
  test(`User font choices win in ${order} order, after switching, updates and teardown`, async ({
    page,
  }) => {
    if (order === "user-first") await addUserFonts(page);
    await switchLocale(page, "ja");
    if (order === "locale-first") await addUserFonts(page);
    const selected = await fonts(page);
    expect(selected.sans).toBe('"User Sans", sans-serif');
    expect(selected.brand).toContain("User Sans");
    expect(selected.code).toBe('"User Mono", monospace');
    for (const value of Object.values(selected)) expect(value).not.toContain("Yu Gothic");
    await page.evaluate(() => {
      document.body.style.setProperty("--dsw-font-family", "Theme Sans");
      document.body.style.setProperty("--ds-font-family-code", "Theme Code");
    });
    expect(await fonts(page)).toEqual(selected);
    for (const id of ["en", "ja", "zh", "ja"]) {
      await switchLocale(page, id);
      expect(await fonts(page)).toEqual(selected);
    }
    await page.evaluate(() => {
      const tag = document.getElementById("user-fonts");
      if (tag === null) throw new Error("Missing user font stylesheet");
      tag.textContent = tag.textContent?.replaceAll("User", "Updated") ?? "";
    });
    const updated = await fonts(page);
    expect(updated.sans).toBe('"Updated Sans", sans-serif');
    expect(updated.code).toBe('"Updated Mono", monospace');
    await switchLocale(page, "en");
    await switchLocale(page, "ja");
    expect(await fonts(page)).toEqual(updated);
    await page.evaluate(() => document.getElementById("user-fonts")?.remove());
    const fallback = await fonts(page);
    expect(fallback.sans).toContain("Yu Gothic");
    expect(fallback.code).toContain("Meiryo");
    await addUserFonts(page);
    expect(await fonts(page)).toEqual(selected);
    await page.evaluate(() => (window as unknown as FontWindow).fontTest.dispose());
    await expect(page.locator(FONT_TAG)).toHaveCount(0);
    await expect(page.locator("#user-fonts")).toHaveCount(1);
    expect(await fonts(page)).toEqual(selected);
    await page.addScriptTag({ content: bundle });
    await expect(page.locator(FONT_TAG)).toHaveCount(1);
    expect(await fonts(page)).toEqual(selected);
    await switchLocale(page, "en");
    await switchLocale(page, "ja");
    expect(await fonts(page)).toEqual(selected);
    await page.evaluate(() => (window as unknown as FontWindow).fontTest.dispose());
    await expect(page.locator(FONT_TAG)).toHaveCount(0);
  });
}

for (const token of ["sans", "code"] as const) {
  test(`A user ${token} override leaves other Japanese fallbacks available`, async ({ page }) => {
    const variable = token === "sans" ? "--dsw-font-family" : "--ds-font-family-code";
    await addUserFonts(page, `:root,body{${variable}:"User Choice" !important;}`);
    await switchLocale(page, "ja");
    const selected = await fonts(page);
    expect(selected[token]).toContain("User Choice");
    if (token === "sans") {
      expect(selected.brand).toContain("User Choice");
      expect(selected.code).toContain("Meiryo");
    } else {
      expect(selected.sans).toContain("Yu Gothic");
      expect(selected.brand).toContain("Yu Gothic");
    }
  });
}
