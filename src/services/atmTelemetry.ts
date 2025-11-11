import { Request, Response } from 'express';
import db from '../db/connect.js';
import { ATM } from '../types/schema.js'; // Assuming ATM type is defined
import {TelemetryPacket} from '../types/schema.js'
import AtmModel from '../models/atmModel.js';

/**
 * @desc    Get telemetry packets for all ATMs
 * @route   (Service function)
 * @access  Private
 *
 * This function fetches all ATM data from the database
 * and maps it to the TelemetryPacket DTO.
 */
export const getAllAtmsTelemetry = (): TelemetryPacket[] => {
  try {
    // 1. Get all full ATM models from the database
    // We trust the model to return a valid ATM[] or throw
    const allAtms: ATM[] = AtmModel.findAllAtms();

    console.log("heyyyyy")
    // 2. Map each full ATM object to a lightweight TelemetryPacket
    const telemetryPackets: TelemetryPacket[] = allAtms.map((atm) => {
      // Build the packet based on the TelemetryPacket interface
      const packet: TelemetryPacket = {
        atmId: atm.id,
        timestamp: new Date().toISOString(), // Use a fresh timestamp for the packet

        // --- Core Status ---
        status: atm.status,
        networkStatus: atm.networkStatus,

        // --- Resource Levels ---
        cashLevel: {
          currentAmount: atm.cashLevel.currentAmount,
        },
        powerStatus: {
          mains: atm.powerStatus.mains,
          generator: atm.powerStatus.generator,
          inverter: atm.powerStatus.inverter,
        },

        // --- Diagnostics ---
        diagnostics: {
          temperatureC: atm.diagnostics.temperatureC,
          errorCodes: atm.diagnostics.errorCodes,
        },
      };
      return packet;
    });

    return telemetryPackets;

  } catch (err) {
    console.error('[Service Error]: Failed to get all ATM telemetry:', (err as Error).message);
    // On failure, return an empty array so the frontend doesn't break
    return [];
  }
};