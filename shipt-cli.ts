#!/usr/bin/env ts-node
/**
 * Shipt Profitability Calculator - CLI
 * Calculates net hourly rate and weekly strategy for Shipt batches
 */

import * as readline from "readline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchInput {
  pay: number;           // Total batch pay including tip estimate
  miles: number;         // Round trip miles driven
  durationHours: number; // Total time including shopping + driving
  itemCount: number;     // Number of items in the order
  stores: number;        // Number of stores in the batch
}

interface BatchResult extends BatchInput {
  gasCost: number;
  netPay: number;
  netHourlyRate: number;
  effortScore: number;   // 1-10, lower is better
  profitabilityScore: number; // composite score
  recommendation: "ACCEPT" | "SKIP" | "MAYBE";
}

interface WeeklyStrategy {
  targetHourlyRate: number;
  hoursPerDay: number;
  daysPerWeek: number;
  projectedWeeklyNet: number;
  projectedMonthlyNet: number;
  minimumAcceptablePay: number; // per batch
}

// ─── Config ───────────────────────────────────────────────────────────────────

const GAS_COST_PER_MILE = 0.18; // Average: ~$3.20/gal ÷ ~18mpg city driving
const WEAR_TEAR_PER_MILE = 0.08; // Conservative wear & tear
const TOTAL_COST_PER_MILE = GAS_COST_PER_MILE + WEAR_TEAR_PER_MILE;

// Effort scoring weights
const EFFORT_WEIGHTS = {
  itemsPerHour: 0.4,  // More items = more physical effort
  milesPerHour: 0.3,  // More driving = more effort
  stores: 0.3,        // Multiple stores = more effort
};

// ─── Calculations ─────────────────────────────────────────────────────────────

function calculateBatch(input: BatchInput, gasPerMile: number): BatchResult {
  const totalCostPerMile = gasPerMile + WEAR_TEAR_PER_MILE;
  const gasCost = input.miles * totalCostPerMile;
  const netPay = input.pay - gasCost;
  const netHourlyRate = netPay / input.durationHours;

  // Effort score: think of it like a "difficulty rating" on a hiking trail
  // Each factor contributes its weight to the overall trail difficulty
  const itemsPerHour = input.itemCount / input.durationHours;
  const milesPerHour = input.miles / input.durationHours;

  const normalizedItems = Math.min(itemsPerHour / 30, 1); // 30 items/hr = max effort
  const normalizedMiles = Math.min(milesPerHour / 20, 1); // 20 miles/hr = max effort
  const normalizedStores = Math.min(input.stores / 3, 1);  // 3+ stores = max effort

  const effortScore = Math.round(
    (normalizedItems * EFFORT_WEIGHTS.itemsPerHour +
      normalizedMiles * EFFORT_WEIGHTS.milesPerHour +
      normalizedStores * EFFORT_WEIGHTS.stores) *
      10
  );

  // Profitability score: net hourly adjusted for effort
  // Like a "value for effort" ratio — high pay + low effort = best score
  const effortPenalty = effortScore / 10; // 0-1 scale
  const profitabilityScore = netHourlyRate * (1 - effortPenalty * 0.3);

  let recommendation: "ACCEPT" | "SKIP" | "MAYBE";
  if (netHourlyRate >= 15 && effortScore <= 6) {
    recommendation = "ACCEPT";
  } else if (netHourlyRate < 10 || effortScore >= 9) {
    recommendation = "SKIP";
  } else {
    recommendation = "MAYBE";
  }

  return {
    ...input,
    gasCost,
    netPay,
    netHourlyRate,
    effortScore,
    profitabilityScore,
    recommendation,
  };
}

function calculateWeeklyStrategy(
  gasPerMile: number,
  targetHourly: number,
  hoursPerDay: number,
  daysPerWeek: number
): WeeklyStrategy {
  const totalCostPerMile = gasPerMile + WEAR_TEAR_PER_MILE;

  // Minimum batch pay to hit target hourly assuming avg 5 miles, 1 hour
  const avgMilesPerBatch = 5;
  const avgHoursPerBatch = 1;
  const minNetPerBatch = targetHourly * avgHoursPerBatch;
  const minimumAcceptablePay = minNetPerBatch + avgMilesPerBatch * totalCostPerMile;

  const weeklyHours = hoursPerDay * daysPerWeek;
  const projectedWeeklyNet = weeklyHours * targetHourly;
  const projectedMonthlyNet = projectedWeeklyNet * 4.3;

  return {
    targetHourlyRate: targetHourly,
    hoursPerDay,
    daysPerWeek,
    projectedWeeklyNet,
    projectedMonthlyNet,
    minimumAcceptablePay,
  };
}

// ─── Display ──────────────────────────────────────────────────────────────────

function printDivider() {
  console.log("─".repeat(50));
}

function printBatchResult(result: BatchResult) {
  printDivider();
  console.log("📦 BATCH ANALYSIS");
  printDivider();
  console.log(`  Gross Pay:        $${result.pay.toFixed(2)}`);
  console.log(`  Miles Driven:     ${result.miles} mi`);
  console.log(`  Gas + Wear Cost:  -$${result.gasCost.toFixed(2)}`);
  console.log(`  ─────────────────────────`);
  console.log(`  Net Pay:          $${result.netPay.toFixed(2)}`);
  console.log(`  Duration:         ${result.durationHours}h`);
  console.log(`  Net Hourly Rate:  $${result.netHourlyRate.toFixed(2)}/hr`);
  console.log(`  Effort Score:     ${result.effortScore}/10 ${getEffortEmoji(result.effortScore)}`);
  console.log(`  Items:            ${result.itemCount} across ${result.stores} store(s)`);
  printDivider();

  const emoji = result.recommendation === "ACCEPT" ? "✅" : result.recommendation === "SKIP" ? "❌" : "🤔";
  console.log(`  RECOMMENDATION:   ${emoji}  ${result.recommendation}`);
  printDivider();
}

function printWeeklyStrategy(strategy: WeeklyStrategy) {
  printDivider();
  console.log("📅 WEEKLY STRATEGY");
  printDivider();
  console.log(`  Target Rate:      $${strategy.targetHourlyRate}/hr net`);
  console.log(`  Schedule:         ${strategy.hoursPerDay}h/day × ${strategy.daysPerWeek} days`);
  console.log(`  Min Batch Pay:    $${strategy.minimumAcceptablePay.toFixed(2)} (to hit target)`);
  console.log(`  ─────────────────────────`);
  console.log(`  Projected Weekly: $${strategy.projectedWeeklyNet.toFixed(2)}`);
  console.log(`  Projected Monthly:$${strategy.projectedMonthlyNet.toFixed(2)}`);
  printDivider();
}

function getEffortEmoji(score: number): string {
  if (score <= 3) return "😊 (easy)";
  if (score <= 6) return "😐 (moderate)";
  if (score <= 8) return "😓 (hard)";
  return "😵 (brutal)";
}

// ─── CLI Prompts ──────────────────────────────────────────────────────────────

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function promptNumber(rl: readline.Interface, question: string): Promise<number> {
  while (true) {
    const answer = await prompt(rl, question);
    const num = parseFloat(answer);
    if (!isNaN(num) && num >= 0) return num;
    console.log("  ⚠️  Please enter a valid number.");
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n🛒  SHIPT PROFITABILITY CALCULATOR");
  console.log("    Your money, your time, your rules.\n");

  // Gas cost setup
  const gasPerMile = await promptNumber(
    rl,
    "  What's your gas cost per mile? (e.g. 0.18 for 18 cents): $"
  );

  console.log("\n  Mode: (1) Evaluate a batch  (2) Weekly strategy  (3) Both");
  const mode = await prompt(rl, "  Choose [1/2/3]: ");

  if (mode === "1" || mode === "3") {
    console.log("\n--- BATCH DETAILS ---");
    const pay = await promptNumber(rl, "  Total batch pay (incl. expected tip): $");
    const miles = await promptNumber(rl, "  Round-trip miles: ");
    const durationHours = await promptNumber(rl, "  Total time in hours (shopping + driving): ");
    const itemCount = await promptNumber(rl, "  Number of items: ");
    const stores = await promptNumber(rl, "  Number of stores: ");

    const result = calculateBatch(
      { pay, miles, durationHours, itemCount, stores },
      gasPerMile
    );
    printBatchResult(result);
  }

  if (mode === "2" || mode === "3") {
    console.log("\n--- WEEKLY GOALS ---");
    const targetHourly = await promptNumber(rl, "  Target net hourly rate: $");
    const hoursPerDay = await promptNumber(rl, "  Hours you want to work per day: ");
    const daysPerWeek = await promptNumber(rl, "  Days per week: ");

    const strategy = calculateWeeklyStrategy(gasPerMile, targetHourly, hoursPerDay, daysPerWeek);
    printWeeklyStrategy(strategy);
  }

  rl.close();
}

main().catch(console.error);
