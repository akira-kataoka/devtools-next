// v3.512.0 Phase 602: picker.js の純粋関数ユニットテスト (テスト初投入)
// 対象: recentMapKey (Org 別 / kind 別の最近選択履歴キー生成)
//
// 公開 export 2 つ (invalidatePickerCache / showPicker) は chrome.* / DOM 依存
// のため対象外。recentMapKey は Phase 602 で export 化された pure 関数。

import { test } from "node:test";
import assert from "node:assert/strict";
import { recentMapKey } from "../js/picker.js";

test("recentMapKey: orgKey + kind で 'orgKey|kind' 形式", () => {
  assert.equal(recentMapKey("00D000000000001", "sobject"), "00D000000000001|sobject");
  assert.equal(recentMapKey("00D000000000001", "field"), "00D000000000001|field");
});

test("recentMapKey: orgKey 空 → 'default' に置換", () => {
  assert.equal(recentMapKey("", "sobject"), "default|sobject");
  assert.equal(recentMapKey(null, "field"), "default|field");
  assert.equal(recentMapKey(undefined, "profile"), "default|profile");
});

test("recentMapKey: kind 違いで別キー (sobject vs field)", () => {
  const k1 = recentMapKey("00D", "sobject");
  const k2 = recentMapKey("00D", "field");
  assert.notEqual(k1, k2);
});

test("recentMapKey: orgKey 違いで別キー (Org 切替で履歴分離される契約)", () => {
  const k1 = recentMapKey("00DPROD", "sobject");
  const k2 = recentMapKey("00DSBX", "sobject");
  assert.notEqual(k1, k2);
});

test("recentMapKey: 区切り文字は固定で '|' (将来の orgKey に | が含まれないことを想定)", () => {
  const k = recentMapKey("X", "Y");
  assert.equal(k, "X|Y");
  assert.equal(k.split("|").length, 2);
});

test("recentMapKey: kind が空文字でもキー生成 (使用側責任、ただし衝突しない)", () => {
  // 現状仕様: kind 空文字でも throw せず "<org>|" を返す。kind 必須は呼出側で担保。
  assert.equal(recentMapKey("X", ""), "X|");
});
