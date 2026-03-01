import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchInput {
  pay: string;
  miles: string;
  durationHours: string;
  itemCount: string;
  stores: string;
}

interface BatchResult {
  gasCost: number;
  netPay: number;
  netHourlyRate: number;
  effortScore: number;
  profitabilityScore: number;
  recommendation: "ACCEPT" | "SKIP" | "MAYBE";
}

interface WeeklyGoals {
  targetHourly: string;
  hoursPerDay: string;
  daysPerWeek: string;
}

interface WeeklyResult {
  projectedWeeklyNet: number;
  projectedMonthlyNet: number;
  minimumAcceptablePay: number;
  totalHours: number;
}

// ─── Calculations ─────────────────────────────────────────────────────────────

const WEAR_TEAR_PER_MILE = 0.08;

function calculateBatch(input: BatchInput, gasPerMile: number): BatchResult | null {
  const pay = parseFloat(input.pay);
  const miles = parseFloat(input.miles);
  const duration = parseFloat(input.durationHours);
  const items = parseFloat(input.itemCount);
  const stores = parseFloat(input.stores);

  if ([pay, miles, duration, items, stores].some(isNaN) || duration === 0) return null;

  const totalCost = (gasPerMile + WEAR_TEAR_PER_MILE) * miles;
  const netPay = pay - totalCost;
  const netHourlyRate = netPay / duration;

  const normalizedItems = Math.min((items / duration) / 30, 1);
  const normalizedMiles = Math.min((miles / duration) / 20, 1);
  const normalizedStores = Math.min(stores / 3, 1);
  const effortScore = Math.round((normalizedItems * 0.4 + normalizedMiles * 0.3 + normalizedStores * 0.3) * 10);
  const profitabilityScore = netHourlyRate * (1 - (effortScore / 10) * 0.3);

  let recommendation: "ACCEPT" | "SKIP" | "MAYBE";
  if (netHourlyRate >= 15 && effortScore <= 6) recommendation = "ACCEPT";
  else if (netHourlyRate < 10 || effortScore >= 9) recommendation = "SKIP";
  else recommendation = "MAYBE";

  return { gasCost: totalCost, netPay, netHourlyRate, effortScore, profitabilityScore, recommendation };
}

function calculateWeekly(goals: WeeklyGoals, gasPerMile: number): WeeklyResult | null {
  const target = parseFloat(goals.targetHourly);
  const hours = parseFloat(goals.hoursPerDay);
  const days = parseFloat(goals.daysPerWeek);

  if ([target, hours, days].some(isNaN)) return null;

  const totalCostPerMile = gasPerMile + WEAR_TEAR_PER_MILE;
  const minNet = target * 1;
  const minimumAcceptablePay = minNet + 5 * totalCostPerMile;
  const totalHours = hours * days;
  const projectedWeeklyNet = totalHours * target;

  return {
    projectedWeeklyNet,
    projectedMonthlyNet: projectedWeeklyNet * 4.3,
    minimumAcceptablePay,
    totalHours,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({ label, value, onChange, placeholder, prefix }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#f9c846", marginBottom: "6px", fontWeight: "bold" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(249,200,70,0.3)", borderRadius: "4px", overflow: "hidden" }}>
        {prefix && (
          <span style={{ padding: "10px 12px", color: "#f9c846", fontFamily: "'Courier New', monospace", fontSize: "14px", borderRight: "1px solid rgba(249,200,70,0.2)", background: "rgba(249,200,70,0.08)" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, padding: "10px 12px", background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: "'Courier New', monospace", fontSize: "14px" }}
        />
      </div>
    </div>
  );
}

function RecommendationBadge({ rec }: { rec: "ACCEPT" | "SKIP" | "MAYBE" }) {
  const config = {
    ACCEPT: { bg: "#1a4a2e", border: "#4ade80", color: "#4ade80", label: "✅ TAKE IT", glow: "0 0 20px rgba(74,222,128,0.4)" },
    SKIP: { bg: "#4a1a1a", border: "#f87171", color: "#f87171", label: "❌ SKIP IT", glow: "0 0 20px rgba(248,113,113,0.4)" },
    MAYBE: { bg: "#3a3a1a", border: "#fbbf24", color: "#fbbf24", label: "🤔 YOUR CALL", glow: "0 0 20px rgba(251,191,36,0.4)" },
  }[rec];
  return (
    <div style={{ textAlign: "center", padding: "16px", background: config.bg, border: `2px solid ${config.border}`, borderRadius: "8px", boxShadow: config.glow }}>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: "22px", fontWeight: "bold", color: config.color, letterSpacing: "0.1em" }}>
        {config.label}
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: "14px", fontWeight: "bold", color: highlight ? "#f9c846" : "#fff" }}>{value}</span>
    </div>
  );
}

function EffortBar({ score }: { score: number }) {
  const color = score <= 3 ? "#4ade80" : score <= 6 ? "#fbbf24" : "#f87171";
  const label = score <= 3 ? "easy" : score <= 6 ? "moderate" : score <= 8 ? "hard" : "brutal";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#999", textTransform: "uppercase", letterSpacing: "0.08em" }}>Effort</span>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "11px", color, fontWeight: "bold" }}>{score}/10 — {label}</span>
      </div>
      <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score * 10}%`, background: color, borderRadius: "3px", transition: "width 0.5s ease", boxShadow: `0 0 8px ${color}` }} />
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function ShiptCalculator() {
  const [gasPerMile, setGasPerMile] = useState("0.18");
  const [batch, setBatch] = useState<BatchInput>({ pay: "", miles: "", durationHours: "", itemCount: "", stores: "1" });
  const [weekly, setWeekly] = useState<WeeklyGoals>({ targetHourly: "15", hoursPerDay: "4", daysPerWeek: "5" });
  const [activeTab, setActiveTab] = useState<"batch" | "weekly">("batch");

  const gasNum = parseFloat(gasPerMile) || 0.18;
  const batchResult = calculateBatch(batch, gasNum);
  const weeklyResult = calculateWeekly(weekly, gasNum);

  const updateBatch = useCallback((key: keyof BatchInput, val: string) => {
    setBatch((prev) => ({ ...prev, [key]: val }));
  }, []);

  const updateWeekly = useCallback((key: keyof WeeklyGoals, val: string) => {
    setWeekly((prev) => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e0a1a",
      backgroundImage: "radial-gradient(ellipse at top, #1a0a2e 0%, #0e0a1a 60%), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(249,200,70,0.04) 39px, rgba(249,200,70,0.04) 40px), repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(249,200,70,0.04) 39px, rgba(249,200,70,0.04) 40px)",
      padding: "32px 16px",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ display: "inline-block", padding: "4px 16px", background: "rgba(249,200,70,0.1)", border: "1px solid rgba(249,200,70,0.3)", borderRadius: "20px", marginBottom: "12px" }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#f9c846", letterSpacing: "0.2em", textTransform: "uppercase" }}>🛒 Shipt Calculator</span>
          </div>
          <h1 style={{ margin: "0 0 4px", fontSize: "32px", fontWeight: "900", color: "#fff", fontFamily: "'Georgia', serif", letterSpacing: "-0.02em" }}>
            Is This Batch Worth It?
          </h1>
          <p style={{ margin: 0, color: "#666", fontSize: "14px", fontFamily: "'Courier New', monospace" }}>your money · your miles · your call</p>
        </div>

        {/* Gas cost global input */}
        <div style={{ background: "rgba(249,200,70,0.06)", border: "1px solid rgba(249,200,70,0.2)", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
          <InputField label="Your gas cost per mile" value={gasPerMile} onChange={setGasPerMile} placeholder="0.18" prefix="$" />
          <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#666", lineHeight: 1.6 }}>
            Tip: divide your $/gallon by your MPG. e.g. $3.20 ÷ 18mpg = $0.18/mi<br />
            We also add $0.08/mi for wear & tear automatically.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {(["batch", "weekly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer",
                fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "0.1em",
                textTransform: "uppercase", fontWeight: "bold", transition: "all 0.2s",
                background: activeTab === tab ? "#f9c846" : "rgba(255,255,255,0.05)",
                color: activeTab === tab ? "#0e0a1a" : "#999",
              }}
            >
              {tab === "batch" ? "📦 Evaluate a Batch" : "📅 Weekly Strategy"}
            </button>
          ))}
        </div>

        {/* Batch Tab */}
        {activeTab === "batch" && (
          <div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
              <InputField label="Batch pay (incl. tip estimate)" value={batch.pay} onChange={(v) => updateBatch("pay", v)} placeholder="12.50" prefix="$" />
              <InputField label="Round-trip miles" value={batch.miles} onChange={(v) => updateBatch("miles", v)} placeholder="8" />
              <InputField label="Total time (hours)" value={batch.durationHours} onChange={(v) => updateBatch("durationHours", v)} placeholder="1.5" />
              <InputField label="Number of items" value={batch.itemCount} onChange={(v) => updateBatch("itemCount", v)} placeholder="25" />
              <InputField label="Number of stores" value={batch.stores} onChange={(v) => updateBatch("stores", v)} placeholder="1" />
            </div>

            {batchResult ? (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px" }}>
                <RecommendationBadge rec={batchResult.recommendation} />
                <div style={{ marginTop: "20px" }}>
                  <StatRow label="Gross Pay" value={`$${parseFloat(batch.pay).toFixed(2)}`} />
                  <StatRow label="Gas + Wear Cost" value={`-$${batchResult.gasCost.toFixed(2)}`} />
                  <StatRow label="Net Pay" value={`$${batchResult.netPay.toFixed(2)}`} highlight />
                  <StatRow label="Net Hourly Rate" value={`$${batchResult.netHourlyRate.toFixed(2)}/hr`} highlight />
                  <div style={{ paddingTop: "12px" }}>
                    <EffortBar score={batchResult.effortScore} />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "32px", color: "#444", fontFamily: "'Courier New', monospace", fontSize: "12px", letterSpacing: "0.1em" }}>
                FILL IN BATCH DETAILS ABOVE
              </div>
            )}
          </div>
        )}

        {/* Weekly Tab */}
        {activeTab === "weekly" && (
          <div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
              <InputField label="Target net hourly rate" value={weekly.targetHourly} onChange={(v) => updateWeekly("targetHourly", v)} placeholder="15" prefix="$" />
              <InputField label="Hours per day" value={weekly.hoursPerDay} onChange={(v) => updateWeekly("hoursPerDay", v)} placeholder="4" />
              <InputField label="Days per week" value={weekly.daysPerWeek} onChange={(v) => updateWeekly("daysPerWeek", v)} placeholder="5" />
            </div>

            {weeklyResult ? (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "20px" }}>
                <StatRow label="Total weekly hours" value={`${weeklyResult.totalHours}h`} />
                <StatRow label="Min batch pay to hit target" value={`$${weeklyResult.minimumAcceptablePay.toFixed(2)}`} />
                <StatRow label="Projected weekly net" value={`$${weeklyResult.projectedWeeklyNet.toFixed(2)}`} highlight />
                <StatRow label="Projected monthly net" value={`$${weeklyResult.projectedMonthlyNet.toFixed(2)}`} highlight />

                <div style={{ marginTop: "20px", padding: "14px", background: "rgba(249,200,70,0.06)", border: "1px solid rgba(249,200,70,0.2)", borderRadius: "6px" }}>
                  <p style={{ margin: 0, fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#f9c846", lineHeight: 1.8 }}>
                    💡 Skip any batch paying less than <strong>${weeklyResult.minimumAcceptablePay.toFixed(2)}</strong> — it'll drag your average below your target rate.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: "24px", fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#333", letterSpacing: "0.1em" }}>
          WEAR & TEAR ESTIMATED AT $0.08/MI · NOT TAX ADVICE
        </p>
      </div>
    </div>
  );
}
