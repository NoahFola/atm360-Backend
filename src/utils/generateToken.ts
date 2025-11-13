import jwt from 'jsonwebtoken';

// We need a JWT_SECRET. This *must* be in an environment variable file
// (e.g., loaded from config/env.ts or process.env).
// For the MVP, we'll define a mock secret here, but flag it to be fixed.
// TODO: Move this to an environment variable file (BE1's task)
const MOCK_JWT_SECRET = process.env.JWT_SECRET_KEY || 'your-very-secret-key-for-mvp';
const MOCK_JWT_EXPIRES_IN = '1d'; // Token expires in 1 day

/**
 * Generates a JWT for a given user ID and role.
 * @param id - The user's ID
 * @param role - The user's role ('admin' or 'engineer')
 * @returns A signed JWT string
 */
export const generateToken = (id: string, role: "ADMIN" | "ENGINEER" | "CUSTOMER"): string => {
  // The payload contains the claims.
  // We include 'id' and 'role' so our middleware can identify the user.
  const payload = {
    id: id,
    role: role,
  };

  const token = jwt.sign(
    payload,
    MOCK_JWT_SECRET,
    { expiresIn: MOCK_JWT_EXPIRES_IN }
  );

  return token;
};