import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dexDrainStateKey,
  detectDrainTransition,
  drainBody,
  drainLevel,
  drainLevelCode,
  drainTitle,
} from "./dex-drain.ts";
import type { DexFragilityReport, FragilityFlag } from "@/lib/market/dex";

function flag(id: FragilityFlag["id"], severity: FragilityFlag["severity"]): FragilityFlag {
  return { id, severity, label: id, detail: `detalhe de ${id}` };
}

function report(flags: FragilityFlag[]): DexFragilityReport {
  return {
    level: "media",
    flags,
    metrics: {
      liquidityUsd: null,
      volume24hUsd: null,
      turnover24h: null,
      sellRatio24h: null,
      sellRatio6h: null,
      volumeTrend: null,
      pairAgeHours: null,
      marketCapUsd: null,
      liqToMcap: null,
    },
    disclaimer: "x",
  };
}

describe("drainLevel — só flags ativas contam, estruturais ficam de fora", () => {
  it("nenhuma flag → none", () => {
    assert.equal(drainLevel(report([])), "none");
  });

  it("só flags estruturais (par_novo, saida_estreita) → none, mesmo em alta severidade", () => {
    const r = report([flag("par_novo", "alta"), flag("saida_estreita", "alta")]);
    assert.equal(drainLevel(r), "none");
  });

  it("1 flag ativa de qualquer severidade → watch", () => {
    assert.equal(drainLevel(report([flag("volume_esfriando", "media")])), "watch");
    assert.equal(drainLevel(report([flag("liquidez_baixa", "alta")])), "watch");
  });

  it("2+ flags ativas de severidade alta → drain", () => {
    const r = report([flag("liquidez_baixa", "alta"), flag("giro_extremo", "alta")]);
    assert.equal(drainLevel(r), "drain");
  });

  it("1 ativa alta + 1 ativa média não chega a drain (precisa 2 altas)", () => {
    const r = report([flag("liquidez_baixa", "alta"), flag("volume_esfriando", "media")]);
    assert.equal(drainLevel(r), "watch");
  });

  it("flags estruturais não contam pro total de watch nem elevam a drain", () => {
    const r = report([
      flag("liquidez_baixa", "alta"),
      flag("par_novo", "alta"),
      flag("saida_estreita", "alta"),
    ]);
    // só 1 ativa alta (liquidez_baixa) — as outras 2 são estruturais.
    assert.equal(drainLevel(r), "watch");
  });
});

describe("drainLevelCode", () => {
  it("mapeia none/watch/drain pra 0/1/2", () => {
    assert.equal(drainLevelCode("none"), 0);
    assert.equal(drainLevelCode("watch"), 1);
    assert.equal(drainLevelCode("drain"), 2);
  });
});

describe("dexDrainStateKey", () => {
  it("normaliza o ticker pra maiúsculo", () => {
    assert.equal(dexDrainStateKey("legs"), "LEGS:_dex_drain");
  });
});

describe("detectDrainTransition — primeira observação", () => {
  it("prevCode undefined e nível é drain → dispara imediatamente", () => {
    const r = report([flag("liquidez_baixa", "alta"), flag("giro_extremo", "alta")]);
    const t = detectDrainTransition(undefined, r);
    assert.ok(t);
    assert.equal(t.from, "none");
    assert.equal(t.to, "drain");
  });

  it("prevCode undefined e nível é watch → fica em silêncio (evita spam ao pinar)", () => {
    const r = report([flag("volume_esfriando", "media")]);
    assert.equal(detectDrainTransition(undefined, r), null);
  });

  it("prevCode undefined e nível é none → silêncio", () => {
    assert.equal(detectDrainTransition(undefined, report([])), null);
  });
});

describe("detectDrainTransition — só dispara ao piorar", () => {
  it("watch → drain dispara", () => {
    const r = report([flag("liquidez_baixa", "alta"), flag("giro_extremo", "alta")]);
    const t = detectDrainTransition(1, r);
    assert.ok(t);
    assert.equal(t.from, "watch");
    assert.equal(t.to, "drain");
  });

  it("none → watch dispara", () => {
    const t = detectDrainTransition(0, report([flag("volume_esfriando", "media")]));
    assert.ok(t);
    assert.equal(t.from, "none");
    assert.equal(t.to, "watch");
  });

  it("drain → watch (recuperação) NUNCA dispara", () => {
    assert.equal(detectDrainTransition(2, report([flag("volume_esfriando", "media")])), null);
  });

  it("drain → none (recuperação total) NUNCA dispara", () => {
    assert.equal(detectDrainTransition(2, report([])), null);
  });

  it("mesmo nível não dispara (nem watch→watch nem drain→drain)", () => {
    assert.equal(detectDrainTransition(1, report([flag("volume_esfriando", "media")])), null);
    const r = report([flag("liquidez_baixa", "alta"), flag("giro_extremo", "alta")]);
    assert.equal(detectDrainTransition(2, r), null);
  });
});

describe("drainTitle / drainBody", () => {
  it("título e corpo citam as flags reais, sem linguagem de ordem", () => {
    const r = report([flag("liquidez_baixa", "alta"), flag("giro_extremo", "alta")]);
    const t = detectDrainTransition(1, r);
    assert.ok(t);
    assert.equal(drainTitle("LEGS", t), "LEGS · drenagem ativa");
    const body = drainBody(t);
    assert.match(body, /liquidez_baixa/);
    assert.match(body, /giro_extremo/);
    assert.match(body, /não é estatística de caminho/);
    for (const proibido of ["compre", "venda agora", "alvo", "stop", "entrada"]) {
      assert.equal(body.toLowerCase().includes(proibido), false);
    }
  });

  it("nível watch usa título mais brando", () => {
    const t = detectDrainTransition(0, report([flag("volume_esfriando", "media")]));
    assert.ok(t);
    assert.equal(drainTitle("PEPE", t), "PEPE · fluxo piorando");
  });
});
