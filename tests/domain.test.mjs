import test from "node:test";
import assert from "node:assert/strict";
import { AppError, email, password, splitIncome, validateSplitRules } from "../server/domain.mjs";

test("validates account percentages total exactly 100", () => {
  assert.equal(validateSplitRules([{ percentage: 35 }, { percentage: 25 }, { percentage: 20 }, { percentage: 20 }]), true);
  assert.throws(() => validateSplitRules([{ percentage: 60 }, { percentage: 39 }]), AppError);
});

test("splits income exactly without losing rounding cents", () => {
  const result = splitIncome(10_001, [
    { id: 1, percentage: 35 }, { id: 2, percentage: 25 },
    { id: 3, percentage: 20 }, { id: 4, percentage: 20 },
  ]);
  assert.equal(result.reduce((sum, split) => sum + split.amountCents, 0), 10_001);
  assert.deepEqual(result.map((split) => split.amountCents), [3501, 2500, 2000, 2000]);
});

test("auth input validation rejects weak or malformed credentials", () => {
  assert.equal(email(" Maya@Example.COM "), "maya@example.com");
  assert.throws(() => email("not-an-email"), AppError);
  assert.equal(password("strong-pass-2025"), "strong-pass-2025");
  assert.throws(() => password("short"), AppError);
});
