// v3.460.0 Phase 550: sf-api.js の recordsToCsv() 純粋関数ユニットテスト
// Phase 548 で残した宿題 (列順・ネスト・日時整形が複雑なため別ファイル化) を消化。
// 期待挙動の出典は js/sf-api.js line 285-331。

import { test } from "node:test";
import assert from "node:assert/strict";
import { recordsToCsv } from "../js/sf-api.js";

// --- 入力境界 -----------------------------------------------------------------

test("recordsToCsv: null / undefined / 空配列はいずれも空文字を返す", () => {
  assert.equal(recordsToCsv(null), "");
  assert.equal(recordsToCsv(undefined), "");
  assert.equal(recordsToCsv([]), "");
});

// --- 基本動作 -----------------------------------------------------------------

test("recordsToCsv: 1 行・2 列 — ヘッダ + 全列ダブルクォート", () => {
  const out = recordsToCsv([{ Id: "001", Name: "Acme" }]);
  assert.equal(out, `"Id","Name"\n"001","Acme"`);
});

test("recordsToCsv: attributes はヘッダにも値にも含めない", () => {
  const out = recordsToCsv([
    { attributes: { type: "Account", url: "/sobjects/Account/001" }, Id: "001", Name: "Acme" },
  ]);
  assert.equal(out, `"Id","Name"\n"001","Acme"`);
});

test("recordsToCsv: 列キーは Set の挿入順で union (record 横断)", () => {
  const out = recordsToCsv([
    { A: 1, B: 2 },
    { C: 3 },
  ]);
  // A, B, C の順
  const lines = out.split("\n");
  assert.equal(lines[0], `"A","B","C"`);
  assert.equal(lines[1], `"1","2",""`);
  assert.equal(lines[2], `"","","3"`);
});

// --- ネストオブジェクト (SF リレーション) -------------------------------------

test("recordsToCsv: 参照子レコード (attributes + Name + Id) → 'Name [Id]'", () => {
  const out = recordsToCsv([
    {
      Id: "001",
      Owner: {
        attributes: { type: "User" },
        Id: "005xx000001234A",
        Name: "Bob",
      },
    },
  ]);
  assert.equal(out, `"Id","Owner"\n"001","Bob [005xx000001234A]"`);
});

test("recordsToCsv: 参照子レコードの Id は先頭 18 文字に切詰 (15→18 ID も対応)", () => {
  const out = recordsToCsv([
    {
      Owner: {
        attributes: {},
        Id: "005xx00000123456789EXTRA",
        Name: "Bob",
      },
    },
  ]);
  // substring(0,18) → "005xx0000012345678" (24 文字を 18 文字に切詰)
  assert.equal(out, `"Owner"\n"Bob [005xx0000012345678]"`);
});

test("recordsToCsv: prefer 順序: Name 不在なら Subject にフォールバック", () => {
  const out = recordsToCsv([
    {
      Case: {
        attributes: {},
        Id: "500abc",
        Subject: "Ticket #1",
      },
    },
  ]);
  assert.equal(out, `"Case"\n"Ticket #1 [500abc]"`);
});

test("recordsToCsv: prefer 順序: Title が候補 (Knowledge Article 想定)", () => {
  const out = recordsToCsv([
    { Article: { attributes: {}, Id: "ka0", Title: "How-to" } },
  ]);
  assert.equal(out, `"Article"\n"How-to [ka0]"`);
});

test("recordsToCsv: Id 不在の参照は ' [Id]' 接尾辞なし", () => {
  const out = recordsToCsv([
    { Owner: { attributes: {}, Name: "Bob" } },
  ]);
  assert.equal(out, `"Owner"\n"Bob"`);
});

test("recordsToCsv: prefer 候補ヒットなし → 最初のフィールド 'key=val'", () => {
  const out = recordsToCsv([
    { Misc: { attributes: {}, CustomField__c: "X" } },
  ]);
  assert.equal(out, `"Misc"\n"CustomField__c=X"`);
});

test("recordsToCsv: attributes だけの空オブジェクトは '{}'", () => {
  const out = recordsToCsv([
    { Owner: { attributes: { type: "User" } } },
  ]);
  assert.equal(out, `"Owner"\n"{}"`);
});

test("recordsToCsv: サブクエリ (records 配列) → '[N 件のサブクエリ]'", () => {
  const out = recordsToCsv([
    {
      Id: "001",
      Contacts: {
        attributes: {},
        records: [{}, {}, {}],
      },
    },
  ]);
  assert.equal(out, `"Id","Contacts"\n"001","[3 件のサブクエリ]"`);
});

test("recordsToCsv: attributes を持たない POJO は JSON.stringify", () => {
  const out = recordsToCsv([{ Meta: { foo: 1, bar: 2 } }]);
  assert.equal(out, `"Meta"\n"{""foo"":1,""bar"":2}"`);
});

// --- 日時整形 -----------------------------------------------------------------

test("recordsToCsv: ISO datetime 'YYYY-MM-DDTHH:mm:ss.sssZ' → 'YYYY-MM-DD HH:mm'", () => {
  const out = recordsToCsv([{ CreatedDate: "2026-05-23T17:10:30.000Z" }]);
  assert.equal(out, `"CreatedDate"\n"2026-05-23 17:10"`);
});

test("recordsToCsv: date-only (T なし) はそのまま (Excel が日付認識)", () => {
  const out = recordsToCsv([{ Birthdate: "2026-05-23" }]);
  assert.equal(out, `"Birthdate"\n"2026-05-23"`);
});

test("recordsToCsv: タイムゾーン付き ISO datetime も '+09:00' を切ってフォーマット", () => {
  const out = recordsToCsv([{ AtTz: "2026-05-23T17:10:00+09:00" }]);
  assert.equal(out, `"AtTz"\n"2026-05-23 17:10"`);
});

// --- 値整形 -------------------------------------------------------------------

test("recordsToCsv: null は '\"\"' (空文字をクォート)", () => {
  const out = recordsToCsv([{ Id: "001", Name: null }]);
  assert.equal(out, `"Id","Name"\n"001",""`);
});

test("recordsToCsv: 数値 / boolean は String 化", () => {
  const out = recordsToCsv([{ Amount: 1234.56, IsActive: true }]);
  assert.equal(out, `"Amount","IsActive"\n"1234.56","true"`);
});

test("recordsToCsv: 値内のダブルクォートは '\"\"' に倍化", () => {
  const out = recordsToCsv([{ Name: `A "test" B` }]);
  assert.equal(out, `"Name"\n"A ""test"" B"`);
});

test("recordsToCsv: ヘッダ名のダブルクォートも倍化される", () => {
  const out = recordsToCsv([{ 'A"B': 1 }]);
  assert.equal(out, `"A""B"\n"1"`);
});

// --- opts.excelBom (Phase 564) ------------------------------------------------

test("recordsToCsv: opts なし / excelBom 未指定 → BOM なし (後方互換)", () => {
  const out = recordsToCsv([{ Id: "001" }]);
  assert.equal(out.charCodeAt(0), 0x22); // '"' (ダブルクォート)
  assert.equal(out, `"Id"\n"001"`);
});

test("recordsToCsv: opts.excelBom=false 明示でも BOM なし", () => {
  const out = recordsToCsv([{ Id: "001" }], { excelBom: false });
  assert.equal(out.charCodeAt(0), 0x22);
});

test("recordsToCsv: opts.excelBom=true → 先頭に U+FEFF BOM を付与", () => {
  const out = recordsToCsv([{ Id: "001" }], { excelBom: true });
  assert.equal(out.charCodeAt(0), 0xFEFF);
  // BOM の後は通常の CSV と同じ内容
  assert.equal(out.substring(1), `"Id"\n"001"`);
});

test("recordsToCsv: BOM 付き出力でも日本語ヘッダ/値はそのまま埋め込まれる (UTF-8 として正しい)", () => {
  const out = recordsToCsv([{ "氏名": "山田 太郎", "部署": "営業" }], { excelBom: true });
  assert.equal(out.charCodeAt(0), 0xFEFF);
  assert.equal(out.substring(1), `"氏名","部署"\n"山田 太郎","営業"`);
});

test("recordsToCsv: 空配列に excelBom=true 指定 → BOM 含まない空文字 (early return が優先)", () => {
  // null/undefined/空 は冒頭で空文字 return しているため BOM すら付かない
  assert.equal(recordsToCsv([], { excelBom: true }), "");
  assert.equal(recordsToCsv(null, { excelBom: true }), "");
});
