import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/AppError.js";
import { Role, User } from "@prisma/client";

export class AuthService {
  /**
   * Registers a new user.
   */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: Role;
  }): Promise<User> {
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new AppError("Email is already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return userRepository.create({
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    });
  }

  /**
   * Logs in a user and returns an accessToken, refreshToken, and user profile.
   */
  async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any }
    );

    await userRepository.update(user.id, { refreshToken });

    return { user, accessToken, refreshToken };
  }

  /**
   * Refreshes a user session.
   */
  async refreshSession(oldRefreshToken: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(oldRefreshToken, config.JWT_REFRESH_SECRET) as { id: string };

      const user = await userRepository.findById(decoded.id);
      if (!user || user.refreshToken !== oldRefreshToken) {
        throw new AppError("Session expired or token reused", 401);
      }

      const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN as any }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        config.JWT_REFRESH_SECRET,
        { expiresIn: config.JWT_REFRESH_EXPIRES_IN as any }
      );

      await userRepository.update(user.id, { refreshToken });

      return { user, accessToken, refreshToken };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid or expired session token", 401);
    }
  }

  /**
   * Logs out a user by nullifying the refresh token.
   */
  async logout(userId: string): Promise<void> {
    await userRepository.update(userId, { refreshToken: null });
  }
}

export const authService = new AuthService();
