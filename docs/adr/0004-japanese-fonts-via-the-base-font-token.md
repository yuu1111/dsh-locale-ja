# ADR-0004: Japanese fonts via the base font token

- Status: Accepted
- Date: 2026-08-14

## Context

The shipped base font stack `--dsw-font-family` is Chinese-leaning. Because
the same CJK codepoints are shared across languages, Japanese text rendered
with that stack uses Chinese-style glyphs.

Every typography style token (for example,
`--dsw-font-base-16-font-family`) reads `var(--dsw-font-family)`, making the
base token the single leverage point. The `styles` builtin is available only
to dynamic plugins, not standard packages, so this plugin must own its
stylesheet.

## Decision

While `ja` is active, create one plugin-owned style tag:

```html
<style data-plugin="@fang2hou/dsh-locale-ja" data-plugin-css="...">
```
The tag overrides `--dsw-font-family` on `:root` with Latin system UI faces
followed by an OS-bundled Japanese-first stack using Hiragino, Yu Gothic,
Meiryo, and Noto Sans JP. No web font is fetched. Insert the tag only while
`ja` is active and
remove it for other locales; synchronize it with locale changes.

The `data-plugin` / `data-plugin-css` attributes follow the convention used by
shipped CSS-module bundles. The contribution is registered through
`ctx.effect`, so teardown removes the tag and restores the shipped behavior.

## Alternatives considered

- **`theme.overrideTokens`.** Rejected: heavier, requires paired light/dark
  values, and targets the global theme rather than a locale-scoped rule.
- **Per-element `font-family`.** Rejected: it does not cascade through the
  many components that set their own font.
- **Replacing the global theme.** Rejected: it overreaches and affects every
  locale.

## Consequences

- Latin text keeps the OS UI font while CJK characters use Japanese glyphs
  only when Japanese is active.
- One locale-scoped stylesheet owns the effect, avoids a network dependency,
  and is reversed on locale changes, plugin updates, or removal.

## Amendment: body-local defaults and user font precedence

The font fix from `yukieiji/dsh-locale-ja` at
`aa82d82cf2b5c5f07448d80942c655b2efb3bf31` expands the Japanese stack and
adds code and brand defaults. DSH `0.2.0-rc.2` also projects theme tokens
onto `body` through the layout presenter; a root-only override cannot
replace a body-local value.

Keep those improvements, but target `:where(:root,body)` instead of
`:root,body`. The declarations remain `!important` to beat the normal
inline theme tokens, while zero selector specificity lets explicit
`!important` font rules win independently of insertion order. The current
`dsh-ui-font` uses `:root,body` with `!important`, so its UI and code choices
stay active through locale switches, setting changes, and plugin reloads.
The brand default keeps Montserrat first and reads `var(--dsw-font-family)`
so its Japanese fallback follows the user-selected UI stack as well.

Do not discover other plugins by inspecting runtime objects, observing DOM
mutations, or polling. The CSS cascade provides the required precedence
without a dependency, additional settings, or lifecycle coordination.
A rule without `!important` does not override these defaults; this is not
a generic font-plugin detection mechanism.

`e2e/font.spec.ts` checks computed fonts in Chromium using the built client
bundle, body-local theme defaults, and the current `dsh-ui-font` CSS shape.
It covers both insertion orders, repeated locale switches, in-place user
setting updates, body-local theme updates, partial overrides, stylesheet removal,
teardown, and plugin reactivation with Japanese already active.
