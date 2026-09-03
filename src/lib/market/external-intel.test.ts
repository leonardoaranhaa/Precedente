import assert from "node:assert/strict";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { parseExternalIntelResponse, validateIntelTicker } from "./external-intel.ts";

type ContentBlock = Anthropic.Messages.ContentBlock;

function textBlock(text: string): ContentBlock {
  return { type: "text", text, citations: null };
}

function searchResultBlock(
  results: { url: string; title: string }[],
): ContentBlock {
  return {
    type: "web_search_tool_result",
    tool_use_id: "toolu_test",
    caller: { type: "direct" },
    content: results.map((r) => ({
      type: "web_search_result",
      url: r.url,
      title: r.title,
      encrypted_content: "x",
      page_age: null,
    })),
  };
}

function searchErrorBlock(): ContentBlock {
  return {
    type: "web_search_tool_result",
    tool_use_id: "toolu_test_err",
    caller: { type: "direct" },
    content: { type: "web_search_tool_result_error", error_code: "unavailable" },
  };
}

test("validateIntelTicker aceita ticker válido e normaliza", () => {
  // normalizeTicker expande pra USDT por padrão — mesmo comportamento usado
  // em todo o app (ver market/labels.ts).
  assert.equal(validateIntelTicker("btc"), "BTCUSDT");
  assert.equal(validateIntelTicker(" ethusdt "), "ETHUSDT");
});

test("validateIntelTicker rejeita entrada vazia ou inválida", () => {
  assert.throws(() => validateIntelTicker(""));
  assert.throws(() => validateIntelTicker("!!!"));
  assert.throws(() => validateIntelTicker(null));
});

test("parseExternalIntelResponse junta blocos de texto e extrai fontes únicas", () => {
  const content: ContentBlock[] = [
    searchResultBlock([
      { url: "https://coindesk.com/a", title: "Notícia A" },
      { url: "https://reuters.com/b", title: "Notícia B" },
    ]),
    textBlock("Resumo factual das últimas notícias."),
  ];
  const result = parseExternalIntelResponse(content, { input_tokens: 1000, output_tokens: 200 });

  assert.equal(result.summary, "Resumo factual das últimas notícias.");
  assert.equal(result.sources.length, 2);
  assert.deepEqual(result.sources[0], { url: "https://coindesk.com/a", title: "Notícia A" });
  assert.equal(result.searchCount, 1);
  assert.ok(result.costUsd > 0);
});

test("parseExternalIntelResponse deduplica URLs repetidas entre buscas", () => {
  const content: ContentBlock[] = [
    searchResultBlock([{ url: "https://coindesk.com/a", title: "A" }]),
    searchResultBlock([{ url: "https://coindesk.com/a", title: "A de novo" }]),
    textBlock("Resumo."),
  ];
  const result = parseExternalIntelResponse(content, { input_tokens: 500, output_tokens: 100 });

  assert.equal(result.sources.length, 1);
  assert.equal(result.searchCount, 2);
});

test("parseExternalIntelResponse ignora bloco de busca com erro (sem crashar)", () => {
  const content: ContentBlock[] = [searchErrorBlock(), textBlock("Nada de relevante encontrado.")];
  const result = parseExternalIntelResponse(content, { input_tokens: 300, output_tokens: 50 });

  assert.equal(result.sources.length, 0);
  assert.equal(result.searchCount, 1);
  assert.equal(result.summary, "Nada de relevante encontrado.");
});

test("parseExternalIntelResponse calcula custo (tokens + $0,01 por busca)", () => {
  const content: ContentBlock[] = [
    searchResultBlock([{ url: "https://x.com/1", title: "1" }]),
    textBlock("Resumo."),
  ];
  const result = parseExternalIntelResponse(content, {
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
  });

  // 1_000_000 * $2/MTok + 1_000_000 * $10/MTok + 1 busca * $0,01 = 2 + 10 + 0.01
  assert.ok(Math.abs(result.costUsd - 12.01) < 1e-9);
});

test("parseExternalIntelResponse sem texto retorna resumo vazio (sem inventar)", () => {
  const content: ContentBlock[] = [searchResultBlock([{ url: "https://x.com/1", title: "1" }])];
  const result = parseExternalIntelResponse(content, { input_tokens: 10, output_tokens: 10 });
  assert.equal(result.summary, "");
});

test("parseExternalIntelResponse ignora narração entre buscas (achado do teste de campo)", () => {
  // O modelo às vezes intercala texto de "pensar alto" entre buscas antes da
  // síntese final — só o texto depois do último bloco de ferramenta conta.
  const content: ContentBlock[] = [
    textBlock("Vou buscar as últimas notícias sobre este ativo."),
    searchResultBlock([{ url: "https://a.com/1", title: "A" }]),
    textBlock("Tenho material suficiente pra elaborar um resumo."),
    searchResultBlock([{ url: "https://b.com/2", title: "B" }]),
    textBlock("Resumo final: nada de relevante nas últimas 48h."),
  ];
  const result = parseExternalIntelResponse(content, { input_tokens: 100, output_tokens: 50 });
  assert.equal(result.summary, "Resumo final: nada de relevante nas últimas 48h.");
});
