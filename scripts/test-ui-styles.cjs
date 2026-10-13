const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'DueFlux_app_mobile/expo/uiStyles.js'), 'utf8');
const sandbox = { module: { exports: {} }, require(name) {
  assert.equal(name, 'react-native');
  return { StyleSheet: { create: styles => styles, absoluteFillObject: {} } };
} };
vm.runInNewContext(source, sandbox);
const { THEMES, createStyles } = sandbox.module.exports;
const css = fs.readFileSync(path.join(root, 'DueFlux_app_desktop/Windows/renderer/ui.css'), 'utf8');

function contrast(first, second) {
  const luminance = value => {
    const channels = value.slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
      .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

test('Native and desktop surfaces use the same semantic palette', () => {
  const palettes = [css.match(/:root\s*{([^}]+)}/)[1], css.match(/html\[data-theme="light"\]\s*{([^}]+)}/)[1]];
  for (const [index, mode] of ['dark', 'light'].entries()) {
    const tokens = Object.fromEntries([...palettes[index].matchAll(/--ui-([\w-]+):\s*(#[\da-f]{6});/g)]
      .map(match => [match[1], match[2]]));
    for (const [mobile, desktop] of Object.entries({ text: 'ink', textMuted: 'muted', surfaceCard: 'surface',
      surfaceCardAlt: 'soft', accent: 'accent', accentStrong: 'primary', border: 'line', success: 'success',
      successSoft: 'success-soft', warning: 'warning', danger: 'danger' })) {
      assert.equal(THEMES[mode][mobile], tokens[desktop], `${mode}/${mobile}`);
    }
  }
});

test('Core text and status colors meet 4.5:1 on their actual native surfaces', () => {
  for (const [mode, theme] of Object.entries(THEMES)) {
    for (const [foreground, background] of [['text', 'surfaceCard'], ['textMuted', 'surfaceCardAlt'],
      ['placeholder', 'inputBg'], ['textInverse', 'accentStrong'], ['accent', 'accentSoft'],
      ['success', 'successSoft'], ['warning', 'warningSoft'], ['danger', 'dangerSoft']]) {
      assert(contrast(theme[foreground], theme[background]) >= 4.5, `${mode}/${foreground}/${background}`);
    }
  }
});

test('Native controls retain touch targets and allow text to grow', () => {
  for (const theme of Object.values(THEMES)) {
    const styles = createStyles(theme);
    for (const name of ['ghostButton', 'ghostButtonWide', 'primaryButton', 'primarySmallInner', 'iconButton',
      'modalClose', 'languageOption', 'languageButton', 'chip', 'statusChip', 'filterChip', 'userPill']) {
      assert(styles[name].minHeight >= 44, name);
      assert.equal(styles[name].height, undefined, `${name} must not crop enlarged labels`);
    }
    assert(styles.modalClose.minWidth >= 44);
    assert.equal(styles.input.height, undefined);
    assert.equal(styles.pulseActions.flexWrap, 'wrap');
    assert.equal(styles.invoiceRowHeader.flexWrap, 'wrap');
    assert.equal(styles.invoiceRowFooter.flexWrap, 'wrap');
    assert.equal(styles.modalFooterRow.flexWrap, 'wrap');
    assert(styles.ghostButtonText.fontSize >= 13);
  }
});

test('Native metrics stack for narrow screens and large text, without losing density selection', () => {
  assert.equal(createStyles(THEMES.dark, 'comfortable', 390, 1).kpiItem.width, '48%');
  assert.equal(createStyles(THEMES.dark, 'comfortable', 320, 1).kpiItem.width, '100%');
  assert.equal(createStyles(THEMES.light, 'comfortable', 390, 1.6).kpiItem.width, '100%');
  assert.equal(createStyles(THEMES.dark, 'compact').invoiceRow.padding, 10);
  assert.equal(createStyles(THEMES.dark, 'comfortable').invoiceRow.padding, 16);
  assert(!/\b(?:margin|padding)(?:Left|Right):/.test(source), 'Use logical edges for RTL languages');
});
