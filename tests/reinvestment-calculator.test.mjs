import assert from "node:assert/strict";
import test from "node:test";
import { calculateAutomaticReinvestmentGross, calculateReinvestmentAmounts } from "../lib/reinvestment-calculator.js";

test("automatic allocation applies the selected percentage and rounds down to six decimals", () => {
  assert.equal(calculateAutomaticReinvestmentGross("123.4567899", 40).toString(), "49.382715");
});

test("one-time reinvestment without a manager fee invests the full gross amount", () => {
  const result = calculateReinvestmentAmounts("250.123456", 0);
  assert.equal(result.grossAmountUsdt.toString(), "250.123456");
  assert.equal(result.investedAmountUsdt.toString(), "250.123456");
  assert.equal(result.feeUsdt.toString(), "0");
});

test("manager fee is contained inside the dividend amount", () => {
  const result = calculateReinvestmentAmounts("105", 5);
  assert.equal(result.investedAmountUsdt.toString(), "100");
  assert.equal(result.feeUsdt.toString(), "5");
  assert.equal(result.investedAmountUsdt.plus(result.feeUsdt).toString(), "105");
});

test("invalid allocation percentages are rejected", () => {
  assert.throws(() => calculateAutomaticReinvestmentGross("100", 0), /invalid_reinvestment_allocation/);
  assert.throws(() => calculateAutomaticReinvestmentGross("100", 101), /invalid_reinvestment_allocation/);
});
