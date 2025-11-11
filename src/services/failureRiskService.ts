import type { ATM } from '../types/schema.js';

/**
 * Calculates the unified 'failureRisk' score for a given ATM.
 * All logic is contained within this single function.
 *
 * @param atm The ATM object to analyze
 * @returns A single risk score (number) between 0.0 and 1.0
 */
export function calculateAtmFailureRisk(atm: ATM): number {
  
  // --- 1. Configuration (Weights & Thresholds) ---
  const WEIGHT_POWER = 0.40;
  const WEIGHT_NETWORK = 0.30;
  const WEIGHT_DIAGNOSTICS = 0.20;
  const WEIGHT_UPTIME = 0.10;

  const CRITICAL_TEMP_C = 50.0;
  const LOW_FUEL_THRESHOLD = 15.0;
  const BASE_NETWORK_RISK = 0.05;

  // --- 2. Calculate PowerScore (0.0 - 1.0) ---
  let powerScore: number;
  const { mains, generator, inverter, fuelLevel } = atm.powerStatus;
  const fuel = fuelLevel ?? 100; // Assume full fuel if unknown

  if (mains) {
    powerScore = 0.0; // On main power, no risk
  } else if (generator && fuel > LOW_FUEL_THRESHOLD) {
    powerScore = 0.3; // Low risk (on stable backup)
  } else if (inverter) {
    powerScore = 0.7; // High risk (on battery)
  } else if (generator && fuel <= LOW_FUEL_THRESHOLD) {
    powerScore = 1.0; // Critical risk (backup fuel low)
  } else {
    powerScore = 0.0; // Default safe case
  }

  // --- 3. Calculate NetworkScore (0.0 - 1.0) ---
  let networkScore: number;
  switch (atm.networkStatus) {
    case 'CONNECTED':
      networkScore = BASE_NETWORK_RISK;
      break;
    case 'INTERMITTENT':
      networkScore = 0.8;
      break;
    case 'DISCONNECTED':
    default:
      networkScore = 0.0;
  }

  // --- 4. Calculate DiagScore (0.0 - 1.0) ---
  const { temperatureC, errorCodes } = atm.diagnostics;

  // Error Score
  const hasErrors = (errorCodes?.length ?? 0) > 0;
  const errorScore = hasErrors ? 1.0 : 0.0;

  // Temp Score
  const temp = temperatureC ?? 30; // Assume 30C if unknown
  const tempScore = Math.min(1.0, Math.max(0, temp / CRITICAL_TEMP_C));

  // Average the two scores
  const diagScore = (errorScore + tempScore) / 2.0;

  // --- 5. Calculate UptimeScore (0.0 - 1.0) ---
  const uptimePercent = atm.uptimeMetrics?.uptimePercentageLast7Days ?? 100;
  const uptimeScore = 1.0 - (uptimePercent / 100.0);

  // --- 6. Calculate Final Weighted Risk Score ---
  const finalRisk =
    (powerScore * WEIGHT_POWER) +
    (networkScore * WEIGHT_NETWORK) +
    (diagScore * WEIGHT_DIAGNOSTICS) +
    (uptimeScore * WEIGHT_UPTIME);

  // Clamp the final score between 0.0 and 1.0
  return Math.min(1.0, Math.max(0.0, finalRisk));
}