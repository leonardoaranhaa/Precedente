import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanePatternRegion } from "./pattern-region.ts";

describe("sanePatternRegion", () => {
  it("passes through a well-formed region", () => {
    const r = { x: 0.1, y: 0.2, width: 0.3, height: 0.25 };
    assert.deepEqual(sanePatternRegion(r), r);
  });

  it("returns null as-is", () => {
    assert.equal(sanePatternRegion(null), null);
  });

  it("discards a region with zero width", () => {
    assert.equal(sanePatternRegion({ x: 0.1, y: 0.1, width: 0, height: 0.2 }), null);
  });

  it("discards a region with negative height", () => {
    assert.equal(sanePatternRegion({ x: 0.1, y: 0.1, width: 0.2, height: -0.1 }), null);
  });

  it("discards a region that overflows the image on x", () => {
    assert.equal(sanePatternRegion({ x: 0.8, y: 0.1, width: 0.5, height: 0.2 }), null);
  });

  it("discards a region that overflows the image on y", () => {
    assert.equal(sanePatternRegion({ x: 0.1, y: 0.9, width: 0.2, height: 0.5 }), null);
  });

  it("tolerates a tiny rounding overflow at the edge", () => {
    const r = { x: 0.5, y: 0.5, width: 0.5, height: 0.505 };
    assert.deepEqual(sanePatternRegion(r), r);
  });
});
