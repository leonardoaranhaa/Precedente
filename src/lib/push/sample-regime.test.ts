import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectRegimeTransition,
  regimeBody,
  sampleNoteCode,
  sampleNoteFromCode,
} from "./sample-regime.ts";

test("sampleNoteCode ordena fragilidade", () => {
  assert.ok(sampleNoteCode("ok") < sampleNoteCode("small"));
  assert.ok(sampleNoteCode("small") < sampleNoteCode("tiny"));
  assert.equal(sampleNoteFromCode(3), "tiny");
});

test("primeira observação não gera transição", () => {
  assert.equal(detectRegimeTransition(undefined, "tiny"), null);
  assert.equal(detectRegimeTransition(0, "small"), null);
});

test("detecta piora ok→small e small→tiny", () => {
  const a = detectRegimeTransition(sampleNoteCode("ok"), "small");
  assert.ok(a?.worsened);
  assert.equal(a?.from, "ok");
  assert.equal(a?.to, "small");

  const b = detectRegimeTransition(sampleNoteCode("small"), "tiny");
  assert.ok(b?.worsened);
  assert.equal(b?.to, "tiny");
});

test("detecta recuperação tiny→ok", () => {
  const t = detectRegimeTransition(sampleNoteCode("tiny"), "ok");
  assert.ok(t?.recovered);
  assert.match(regimeBody(t!, 40), /voltou a ok/);
});

test("mesmo regime não gera evento", () => {
  assert.equal(detectRegimeTransition(sampleNoteCode("small"), "small"), null);
});
