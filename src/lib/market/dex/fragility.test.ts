import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assessDexFragility,
  DEX_FRAGILITY_DISCLAIMER,
  type DexFragilityInput,
} from "./fragility.ts";

/** Par saudável: velho, líquido, giro baixo, fluxo equilibrado. */
function base(): DexFragilityInput {
  return {
    liquidityUsd: 5_000_000,
    volume24hUsd: 1_000_000,
    volume6hUsd: 250_000,
    volume1hUsd: 42_000,
    buys24h: 500,
    sells24h: 500,
    buys6h: 120,
    sells6h: 120,
    priceChange24hPct: 2,
    pairAgeHours: 9_000,
  };
}

function ids(input: DexFragilityInput): string[] {
  return assessDexFragility(input).flags.map((f) => f.id);
}

test("par maduro e líquido não levanta nenhuma flag", () => {
  const r = assessDexFragility(base());
  assert.deepEqual(r.flags, []);
  assert.equal(r.level, "observavel");
});

test("idade: <168h marca par recente, <48h marca novíssimo com severidade alta", () => {
  const recente = assessDexFragility({ ...base(), pairAgeHours: 120 });
  const f1 = recente.flags.find((f) => f.id === "par_novo");
  assert.ok(f1);
  assert.equal(f1.severity, "media");
  assert.match(f1.detail, /5d/);

  const novo = assessDexFragility({ ...base(), pairAgeHours: 30 });
  const f2 = novo.flags.find((f) => f.id === "par_novo");
  assert.ok(f2);
  assert.equal(f2.severity, "alta");
  assert.match(f2.detail, /30h/);
});

test("limiar de idade é exclusivo: exatamente 168h não é par recente", () => {
  assert.equal(ids({ ...base(), pairAgeHours: 168 }).includes("par_novo"), false);
  assert.equal(ids({ ...base(), pairAgeHours: 167 }).includes("par_novo"), true);
});

test("liquidez: <50k é baixa, <10k é mínima e alta severidade", () => {
  const baixa = assessDexFragility({ ...base(), liquidityUsd: 40_000, volume24hUsd: 1_000 });
  const f1 = baixa.flags.find((f) => f.id === "liquidez_baixa");
  assert.ok(f1);
  assert.equal(f1.severity, "media");
  assert.match(f1.detail, /US\$ 40K/);

  const minima = assessDexFragility({ ...base(), liquidityUsd: 4_000, volume24hUsd: 1_000 });
  const f2 = minima.flags.find((f) => f.id === "liquidez_baixa");
  assert.ok(f2);
  assert.equal(f2.severity, "alta");
});

test("giro: volume 24h sobre a liquidez vira turnover e flag", () => {
  const alto = assessDexFragility({ ...base(), liquidityUsd: 1_000_000, volume24hUsd: 4_000_000 });
  assert.equal(alto.metrics.turnover24h, 4);
  const f1 = alto.flags.find((f) => f.id === "giro_extremo");
  assert.ok(f1);
  assert.equal(f1.severity, "media");
  assert.equal(f1.label, "Giro alto");

  const extremo = assessDexFragility({ ...base(), liquidityUsd: 1_000_000, volume24hUsd: 15_000_000 });
  const f2 = extremo.flags.find((f) => f.id === "giro_extremo");
  assert.ok(f2);
  assert.equal(f2.severity, "alta");
  assert.equal(f2.label, "Giro extremo");
});

test("pressão de venda usa a razão sells/(buys+sells) e cita as 6h", () => {
  const r = assessDexFragility({
    ...base(),
    buys24h: 300,
    sells24h: 700,
    buys6h: 20,
    sells6h: 80,
  });
  assert.equal(r.metrics.sellRatio24h, 0.7);
  assert.equal(r.metrics.sellRatio6h, 0.8);
  const f = r.flags.find((f) => f.id === "pressao_venda");
  assert.ok(f);
  assert.equal(f.severity, "alta");
  assert.match(f.detail, /70%/);
  assert.match(f.detail, /Em 6h: 80%/);
});

test("fluxo equilibrado não vira pressão de venda", () => {
  assert.equal(
    ids({ ...base(), buys24h: 520, sells24h: 480 }).includes("pressao_venda"),
    false,
  );
});

test("volume esfriando compara a última hora com o ritmo das 6h", () => {
  // 10k*6 = 60k contra 600k realizados → 10% do ritmo.
  const r = assessDexFragility({ ...base(), volume1hUsd: 10_000, volume6hUsd: 600_000 });
  assert.ok(r.metrics.volumeTrend !== null);
  assert.equal(Math.round(r.metrics.volumeTrend * 100), 10);
  const f = r.flags.find((f) => f.id === "volume_esfriando");
  assert.ok(f);
  assert.match(f.detail, /10%/);
});

test("volume acelerando não vira flag", () => {
  assert.equal(
    ids({ ...base(), volume1hUsd: 200_000, volume6hUsd: 600_000 }).includes("volume_esfriando"),
    false,
  );
});

test("preço fino exige alta forte E liquidez rasa — não uma só", () => {
  // Alta forte, mas pool profundo: não é fino.
  assert.equal(
    ids({ ...base(), priceChange24hPct: 80 }).includes("preco_fino"),
    false,
  );
  // Pool raso, mas preço parado: não é fino.
  assert.equal(
    ids({ ...base(), liquidityUsd: 20_000, volume24hUsd: 1_000, priceChange24hPct: 3 }).includes(
      "preco_fino",
    ),
    false,
  );
  // Os dois juntos: fino.
  const r = assessDexFragility({
    ...base(),
    liquidityUsd: 20_000,
    volume24hUsd: 1_000,
    priceChange24hPct: 80,
  });
  const f = r.flags.find((f) => f.id === "preco_fino");
  assert.ok(f);
  assert.match(f.detail, /\+80%/);
});

test("queda forte também conta como preço fino (usa o módulo)", () => {
  const r = assessDexFragility({
    ...base(),
    liquidityUsd: 20_000,
    volume24hUsd: 1_000,
    priceChange24hPct: -60,
  });
  const f = r.flags.find((f) => f.id === "preco_fino");
  assert.ok(f);
  assert.match(f.detail, /-60%/);
});

test("nível escala com a quantidade de flags de severidade alta", () => {
  // 1 alta → media
  assert.equal(assessDexFragility({ ...base(), pairAgeHours: 12 }).level, "media");
  // 2 altas (par novíssimo + liquidez mínima) → alta
  assert.equal(
    assessDexFragility({
      ...base(),
      pairAgeHours: 12,
      liquidityUsd: 5_000,
      volume24hUsd: 1_000,
    }).level,
    "alta",
  );
  // 3 altas (+ giro extremo) → extrema
  assert.equal(
    assessDexFragility({
      ...base(),
      pairAgeHours: 12,
      liquidityUsd: 5_000,
      volume24hUsd: 500_000,
    }).level,
    "extrema",
  );
});

test("duas flags médias, sem nenhuma alta, ainda somam nível media", () => {
  const r = assessDexFragility({
    ...base(),
    pairAgeHours: 120,
    volume1hUsd: 10_000,
    volume6hUsd: 600_000,
  });
  assert.deepEqual(
    r.flags.map((f) => f.severity),
    ["media", "media"],
  );
  assert.equal(r.level, "media");
});

test("cenário completo: token de ciclo curto sendo drenado", () => {
  const r = assessDexFragility({
    liquidityUsd: 8_000,
    volume24hUsd: 400_000,
    volume6hUsd: 300_000,
    volume1hUsd: 5_000,
    buys24h: 200,
    sells24h: 600,
    buys6h: 30,
    sells6h: 170,
    priceChange24hPct: -55,
    pairAgeHours: 36,
  });
  assert.equal(r.level, "extrema");
  assert.deepEqual(r.flags.map((f) => f.id).sort(), [
    "giro_extremo",
    "liquidez_baixa",
    "par_novo",
    "preco_fino",
    "pressao_venda",
    "volume_esfriando",
  ]);
});

test("dados ausentes viram métricas null, não NaN nem flag inventada", () => {
  const r = assessDexFragility({
    liquidityUsd: null,
    volume24hUsd: null,
    buys24h: null,
    sells24h: null,
    priceChange24hPct: null,
    pairAgeHours: null,
  });
  assert.deepEqual(r.flags, []);
  assert.equal(r.level, "observavel");
  assert.equal(r.metrics.turnover24h, null);
  assert.equal(r.metrics.sellRatio24h, null);
  assert.equal(r.metrics.sellRatio6h, null);
  assert.equal(r.metrics.volumeTrend, null);
});

test("liquidez zero não vira divisão por zero no turnover", () => {
  const r = assessDexFragility({ ...base(), liquidityUsd: 0, volume24hUsd: 100_000 });
  assert.equal(r.metrics.turnover24h, null);
  assert.equal(ids({ ...base(), liquidityUsd: 0, volume24hUsd: 100_000 }).includes("giro_extremo"), false);
});

test("par sem transação nenhuma não vira pressão de venda", () => {
  const r = assessDexFragility({ ...base(), buys24h: 0, sells24h: 0 });
  assert.equal(r.metrics.sellRatio24h, null);
  assert.equal(r.flags.some((f) => f.id === "pressao_venda"), false);
});

test("o relatório sempre carrega o disclaimer de não-precedente", () => {
  assert.equal(assessDexFragility(base()).disclaimer, DEX_FRAGILITY_DISCLAIMER);
  assert.match(DEX_FRAGILITY_DISCLAIMER, /não é estatística de caminho/i);
});

test("nenhuma flag usa linguagem de compra ou venda como ordem", () => {
  const r = assessDexFragility({
    liquidityUsd: 8_000,
    volume24hUsd: 400_000,
    volume6hUsd: 300_000,
    volume1hUsd: 5_000,
    buys24h: 200,
    sells24h: 600,
    buys6h: 30,
    sells6h: 170,
    priceChange24hPct: -55,
    pairAgeHours: 36,
  });
  const texto = r.flags.map((f) => `${f.label} ${f.detail}`).join(" ").toLowerCase();
  for (const proibido of ["compre", "venda agora", "recomend", "alvo", "stop", "entrada"]) {
    assert.equal(texto.includes(proibido), false, `flag não deve dizer "${proibido}"`);
  }
});

test("saída estreita: pool minúscula sustentando valor de mercado grande", () => {
  // Números reais do print do DexScreener: LIQ $228K, MCAP $98.9M.
  const r = assessDexFragility({
    ...base(),
    liquidityUsd: 228_000,
    volume24hUsd: 11_000_000,
    marketCapUsd: 98_900_000,
  });
  assert.ok(r.metrics.liqToMcap !== null);
  assert.equal(Number((r.metrics.liqToMcap * 100).toFixed(2)), 0.23);
  const f = r.flags.find((f) => f.id === "saida_estreita");
  assert.ok(f);
  assert.equal(f.severity, "alta");
  assert.equal(f.label, "Saída mínima");
  assert.match(f.detail, /US\$ 228K/);
  assert.match(f.detail, /US\$ 98,9M/);
  // 0,23% precisa sobreviver ao arredondamento — virar "0%" apagaria o fato.
  assert.match(f.detail, /0,23%/);
});

test("saída entre 1% e 5% é estreita, não mínima", () => {
  const r = assessDexFragility({ ...base(), liquidityUsd: 3_000_000, marketCapUsd: 100_000_000 });
  const f = r.flags.find((f) => f.id === "saida_estreita");
  assert.ok(f);
  assert.equal(f.severity, "media");
  assert.equal(f.label, "Saída estreita");
  assert.match(f.detail, /3%/);
});

test("liquidez saudável contra o market cap não levanta flag", () => {
  const r = assessDexFragility({ ...base(), liquidityUsd: 15_000_000, marketCapUsd: 100_000_000 });
  assert.equal(r.metrics.liqToMcap, 0.15);
  assert.equal(r.flags.some((f) => f.id === "saida_estreita"), false);
});

test("sem market cap não se inventa razão de saída", () => {
  const r = assessDexFragility(base());
  assert.equal(r.metrics.liqToMcap, null);
  assert.equal(r.metrics.marketCapUsd, null);
  assert.equal(r.flags.some((f) => f.id === "saida_estreita"), false);
});
