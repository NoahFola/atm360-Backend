import { Request, Response } from "express";
import db from "../db/connect.js"; // Assumes db connection from BE1
import { generateToken } from "../utils/generateToken.js"; // Your util
import { User } from "../types/schema.js"; // Assumes a User type is defined in src/types

/**
 * @desc    Authenticate user & get token
 * @route   POST /auth/login
 * @access  Public
 */
export const loginUser = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide username and password" });
    }

    // 1. Find user in the database
    // In a real app, you'd SELECT based on username only and then compare hashed passwords.
    // For this mock MVP, we query directly.
    const stmt = db.prepare("SELECT * FROM Users WHERE email = ?");
    const user = stmt.get(email) as User | undefined;

    // 2. Check if user exists and password matches
    // NOTE: This is a mock password check. Never store plain text passwords!
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Generate JWT
    console.log(user);
    const token = generateToken(user.id, user.role);

    // 4. Send token and role back to frontend
    // The frontend needs the role immediately to know which dashboard to redirect to.
    res.setHeader("Authorization", `Bearer ${token}`);

    res.status(200).json({
      message: "Login successful",
      token: token,
      role: user.role, // 'admin' or 'engineer'
    });
  } catch (err) {
    //Type check the error
    let errorMessage = "Server error during login";
    if (err instanceof Error) {
      errorMessage = err.message;
    }
    console.error("Login error:", errorMessage);
    res.status(500).json({ message: errorMessage });
  }
};

/**
 * @desc    (Optional) Get current user profile
 * @route   GET /auth/me
 * @access  Private (Needs auth middleware)
 */
export const getMe = (req: Request, res: Response) => {
  // This route would be protected.
  // The auth middleware would have already verified the token
  // and attached the user data to `req.user`.

  // res.status(200).json(req.user);
  res.status(501).json({ message: "Not implemented yet" });
};
