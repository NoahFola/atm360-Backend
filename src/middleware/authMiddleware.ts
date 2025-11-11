import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import db from "../db/connect.js";
import { User } from "../types/schema.js"; // Import our User type

// Extend the JwtPayload to include our custom role property
interface CustomJwtPayload extends JwtPayload {
  id: string;
  role: "admin" | "engineer";
}

/**
 * @desc    Protect routes by verifying JWT
 * @access  Private
 */
export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;

  // 1. Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 2. Get token from header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(" ")[1];

      // 3. Verify token
      // We need a JWT_SECRET, which should be in config/env.ts
      // For now, let's hardcode a mock secret (BE1/config should fix this)
      const MOCK_JWT_SECRET = "your-very-secret-key-for-mvp";
      const decoded = jwt.verify(token, MOCK_JWT_SECRET) as CustomJwtPayload;
      console.log(decoded);
      console.log("Decoded JWT payload:", decoded);
      // 4. Get user from the database
      // We select all fields *except* the password
      const stmt = db.prepare("SELECT id, email, role FROM Users WHERE id = ?");
      const user: User | undefined = stmt.get(decoded.id) as User | undefined;

      if (!user) {
        return res
          .status(401)
          .json({ message: "User not found, token failed" });
      }

      // 5. Attach user to the request object
      req.user = user;
      next();
    } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

/**
 * @desc    Restrict access based on user role
 * @access  Private (Role-specific)
 */
export const restrictTo = (...roles: Array<"ADMIN" | "ENGINEER">) => {
  // <-- 1. As you requested
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // 2. We use 'as' to solve the "CUSTOMER" type mismatch
    // This tells TypeScript: "Trust me, for this check, only
    // compare the 'ADMIN' and 'ENGINEER' parts."
    if (!roles.includes(req.user.role as "ADMIN" | "ENGINEER")) {
      return res.status(403).json({
        message: "You do not have permission to perform this action",
      });
    }

    // 3. User is authorized
    next();
  };
};
