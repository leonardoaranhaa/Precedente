import assert from "node:assert/strict";
import { test } from "node:test";
import { detectCategories, detectCoins } from "./classify.ts";

test("detectCoins encontra ticker e nome por extenso", () => {
  assert.deepEqual(detectCoins("Bitcoin price surges past resistance"), ["BTC"]);
  assert.deepEqual(detectCoins("ETH gas fees drop after upgrade"), ["ETH"]);
});

test("detectCoins detecta múltiplas moedas na mesma manchete", () => {
  const coins = detectCoins("Bitcoin and Ethereum both rally while Solana lags");
  assert.deepEqual([...coins].sort(), ["BTC", "ETH", "SOL"]);
});

test("detectCoins não casa substring dentro de outra palavra", () => {
  // "op" não deveria casar dentro de "opportunity"
  assert.deepEqual(detectCoins("A new opportunity for investors"), []);
});

test("detectCoins retorna vazio quando nenhuma moeda conhecida aparece", () => {
  assert.deepEqual(detectCoins("Generic market commentary with no specific asset"), []);
});

// Achado de revisão: tickers cuja forma nua colide com palavra comum do
// inglês ("near", "dot", "link", "arb", "atom", "op") geravam falso
// positivo em manchetes sem nenhuma relação com a moeda.
test("detectCoins não confunde palavra comum do inglês com ticker ambíguo", () => {
  assert.deepEqual(detectCoins("Bitcoin price near key resistance level"), ["BTC"]);
  assert.deepEqual(detectCoins("Fed's dot plot signals rate cuts"), []);
  assert.deepEqual(detectCoins("Traders spot an arb opportunity between exchanges"), []);
  assert.deepEqual(detectCoins("The op-ed argues for clearer crypto rules"), []);
  assert.deepEqual(detectCoins("Click the link below to read more"), []);
  assert.deepEqual(detectCoins("Cosmic rays reach a new peak, say scientists"), []);
});

test("detectCoins ainda reconhece o ticker ambíguo em maiúsculas ou com $", () => {
  assert.deepEqual(detectCoins("LINK surges 12% after partnership news"), ["LINK"]);
  assert.deepEqual(detectCoins("$ARB rallies as Arbitrum usage grows"), ["ARB"]);
  assert.deepEqual(detectCoins("DOT holders vote on next parachain auction"), ["DOT"]);
  assert.deepEqual(detectCoins("NEAR price target raised by analysts"), ["NEAR"]);
});

test("detectCategories reconhece regulação, segurança e institucional", () => {
  assert.deepEqual(detectCategories("SEC proposes new crypto rule"), ["regulatory"]);
  assert.deepEqual(detectCategories("Exchange hacked, funds drained"), ["security"]);
  // "inflows" também casa com "market" — uma manchete de ETF institucional
  // legitimamente carrega as duas categorias, não é um erro do classificador.
  assert.ok(detectCategories("BlackRock ETF sees record inflows").includes("institutional"));
});

test("detectCategories pode retornar mais de uma categoria", () => {
  const cats = detectCategories("SEC regulation drives institutional ETF inflows");
  assert.ok(cats.includes("regulatory"));
  assert.ok(cats.includes("institutional"));
});

test("detectCategories retorna vazio pra texto sem palavra-chave conhecida", () => {
  assert.deepEqual(detectCategories("Uma manchete qualquer sem termo reconhecido aqui"), []);
});

// Achado do teste de campo: as fontes configuradas (sources.ts) publicam em
// inglês — manchetes reais usadas aqui vieram do teste ao vivo contra
// CoinDesk/Cointelegraph/Decrypt/Bitcoin.com News.
test("detectCategories reconhece manchetes reais em inglês (achado do teste de campo)", () => {
  assert.deepEqual(
    detectCategories("DOJ says Hamas crypto seizures reached $560,000"),
    ["regulatory"],
  );
  assert.deepEqual(detectCategories("Coinbase launches regulated crypto derivatives in Canada"), [
    "regulatory",
  ]);
  assert.deepEqual(
    detectCategories("US officials work with CrowdStrike to fight malware behind crypto theft"),
    ["security"],
  );
  assert.deepEqual(
    detectCategories("Kraken parent Payward delays IPO to second quarter of 2027"),
    ["institutional"],
  );
  assert.deepEqual(
    detectCategories("Goldman Sachs, BofA Among 21 Banks Planning Joint Dollar Stablecoin Launch"),
    ["institutional"],
  );
});
