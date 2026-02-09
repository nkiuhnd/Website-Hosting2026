import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role?: string;
  };
}

// Cache to prevent too many DB updates (debounce 1 min)
const activeStatusCache = new Map<string, number>();

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.user = verified as any;

    // Update lastActiveAt
    if (req.user?.id) {
        const now = Date.now();
        const lastUpdate = activeStatusCache.get(req.user.id) || 0;
        if (now - lastUpdate > 60 * 1000) {
            activeStatusCache.set(req.user.id, now);
            // Fire and forget
            prisma.user.update({
                where: { id: req.user.id },
                data: { lastActiveAt: new Date() }
            }).catch(() => {});
        }
    }

    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    req.user = verified as any;
    next();
  } catch (error) {
    // If token is invalid, just ignore it and proceed as guest
    next();
  }
};
