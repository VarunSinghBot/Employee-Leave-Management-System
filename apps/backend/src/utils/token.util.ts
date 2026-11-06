import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import {
  ACCESS_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
  COOKIE_NAMES,
  REFRESH_COOKIE_OPTIONS,
} from "../constants.js";
import prisma from "../db/prisma.db.js";

export interface TokenPayload {
  sub: string;
}

const secret = (name: "ACCESS_TOKEN_SECRET" | "REFRESH_TOKEN_SECRET") => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing in .env`);
  return value;
};

const sign = (userId: string, secretName: "ACCESS_TOKEN_SECRET" | "REFRESH_TOKEN_SECRET", expiresIn: string) =>
  jwt.sign({ sub: userId }, secret(secretName), { expiresIn } as SignOptions);

export const verifyAccessToken = (token: string) => jwt.verify(token, secret("ACCESS_TOKEN_SECRET")) as TokenPayload;
export const verifyRefreshToken = (token: string) => jwt.verify(token, secret("REFRESH_TOKEN_SECRET")) as TokenPayload;

// Refresh tokens are stored hashed so a DB leak doesn't leak usable tokens
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

// Issues a fresh access/refresh pair, persists the refresh hash and sets both cookies
export const issueAuthCookies = async (res: Response, userId: string) => {
  const accessToken = sign(userId, "ACCESS_TOKEN_SECRET", process.env.ACCESS_TOKEN_EXPIRY ?? "15m");
  const refreshToken = sign(userId, "REFRESH_TOKEN_SECRET", process.env.REFRESH_TOKEN_EXPIRY ?? "7d");

  await prisma.user.update({ where: { id: userId }, data: { refreshToken: hashToken(refreshToken) } });

  res
    .cookie(COOKIE_NAMES.ACCESS, accessToken, ACCESS_COOKIE_OPTIONS)
    .cookie(COOKIE_NAMES.REFRESH, refreshToken, REFRESH_COOKIE_OPTIONS);
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(COOKIE_NAMES.ACCESS, CLEAR_COOKIE_OPTIONS).clearCookie(COOKIE_NAMES.REFRESH, CLEAR_COOKIE_OPTIONS);
};
