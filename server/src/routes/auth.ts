import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const router = Router();
const LOCKOUT_THRESHOLD = parseInt(process.env.LOCKOUT_THRESHOLD || '3', 10);
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_MINUTES || '10', 10);

router.post('/register', async (req, res) => {
  try {
    const { username, password, phone, recoveryCode } = req.body;
    if (!username || !password || !phone) {
      return res.status(400).json({ message: 'Username, password and phone are required' });
    }

    const existingByUsername = await prisma.user.findUnique({ where: { username } });
    if (existingByUsername) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    const existingByPhone = await prisma.user.findFirst({ where: { phone } });
    if (existingByPhone) {
      return res.status(400).json({ message: 'Phone already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const recoveryCodeHash = recoveryCode ? await bcrypt.hash(String(recoveryCode), 10) : null;

    // 使用单次创建操作替代先创建后更新，避免潜在的竞态条件
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        phone,
        recoveryCodeHash
      },
    });

    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error: any) {
    console.error('Registration error details:', error);
    
    // 根据错误类型返回具体信息
    if (error.code === 'P2002') {
      // 唯一约束冲突
      if (error.meta?.target?.includes('username')) {
        return res.status(400).json({ message: 'Username already exists' });
      } else if (error.meta?.target?.includes('phone')) {
        return res.status(400).json({ message: 'Phone already registered' });
      }
      return res.status(400).json({ message: 'Username or phone already exists' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Database record not found' });
    } else if (error.code.startsWith('E')) {
      // Node.js 系统错误
      return res.status(500).json({ message: 'System error occurred', error: error.message });
    }
    
    // 其他未知错误
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } }) as any;

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.status === 'BANNED') {
        return res.status(403).json({ message: 'Account is banned' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      return res.status(423).json({
        message: 'Account is locked for 10 minutes. Use phone+PIN to reset.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      if (attempts >= LOCKOUT_THRESHOLD) {
        const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: until } as any
        });
        return res.status(423).json({
          message: 'Account is locked for 10 minutes. Use phone+PIN to reset.'
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: attempts } as any
        });
      }
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update lastLoginAt and IP
    const ip = req.ip || '';
    const userAgent = req.headers['user-agent'] || '';

    await prisma.user.update({
        where: { id: user.id },
        data: { 
            lastLoginAt: new Date(), 
            lastLoginIp: String(ip),
            failedLoginAttempts: 0, 
            lockedUntil: null 
        } as any
    });

    // Create Login Log
    try {
        await prisma.loginLog.create({
            data: {
                userId: user.id,
                ip: String(ip),
                userAgent: String(userAgent),
                status: 'SUCCESS'
            }
        });
    } catch (e) {
        console.error('Failed to create login log:', e);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '24h' }
    );
    res.json({ token, username: user.username, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/forgot', async (req, res) => {
  try {
    const { phone, recoveryCode, newPassword } = req.body;
    if (!phone || !recoveryCode || !newPassword) {
      return res.status(400).json({ message: 'Phone, recoveryCode and newPassword are required' });
    }
    const user = await prisma.user.findFirst({ where: { phone } }) as any;
    if (!user) return res.status(400).json({ message: 'Invalid phone' });
    if (user.status === 'BANNED') {
      return res.status(403).json({ message: 'Account is banned' });
    }
    if (!user.recoveryCodeHash) {
      return res.status(400).json({ message: 'Recovery code not set' });
    }
    const ok = await bcrypt.compare(String(recoveryCode), user.recoveryCodeHash);
    if (!ok) return res.status(400).json({ message: 'Invalid recovery code' });
    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, failedLoginAttempts: 0, lockedUntil: null } as any
    });
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
    let userPayload: any;
    try {
      userPayload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    } catch {
      return res.status(403).json({ message: 'Invalid token' });
    }
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'oldPassword and newPassword are required' });
    const user = await prisma.user.findUnique({ where: { id: userPayload.id } });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const ok = await bcrypt.compare(String(oldPassword), user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid old password' });
    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
    res.json({ message: 'Password changed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/set-recovery-code', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });
    let userPayload: any;
    try {
      userPayload = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    } catch {
      return res.status(403).json({ message: 'Invalid token' });
    }
    const { recoveryCode } = req.body;
    if (!recoveryCode) return res.status(400).json({ message: 'recoveryCode is required' });
    const recoveryCodeHash = await bcrypt.hash(String(recoveryCode), 10);
    await prisma.user.update({ where: { id: userPayload.id }, data: { recoveryCodeHash } as any });
    res.json({ message: 'Recovery code set' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/lookup-username', async (req, res) => {
  try {
    const phone = String(req.query.phone || '');
    if (!phone) return res.status(400).json({ message: 'phone is required' });
    const user = await prisma.user.findFirst({
      where: { phone },
      select: { username: true }
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
