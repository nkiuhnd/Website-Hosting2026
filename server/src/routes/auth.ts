import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { sendSmsCode, verifySmsCode } from '../utils/sms';

const router = Router();
const LOCKOUT_THRESHOLD = parseInt(process.env.LOCKOUT_THRESHOLD || '5', 10);
const LOCKOUT_MINUTES = parseInt(process.env.LOCKOUT_MINUTES || '30', 10);

router.post('/send-code', async (req, res) => {
  const { phone, type } = req.body; // type: 'register' | 'reset'
  if (!phone) return res.status(400).json({ message: '请输入手机号' });

  // Check if phone exists/not exists based on type
  if (type === 'register') {
    const exists = await prisma.user.findFirst({ where: { phone } });
    if (exists) return res.status(400).json({ message: '该手机号已注册，请直接登录' });
  } else if (type === 'reset') {
    const exists = await prisma.user.findFirst({ where: { phone } });
    if (!exists) return res.status(404).json({ message: '该手机号未注册' });
  }

  try {
    await sendSmsCode(phone); 
    res.json({ message: '验证码已发送' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/reset-password/send-code', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: '请输入手机号' });
    
    const exists = await prisma.user.findFirst({ where: { phone } });
    if (!exists) return res.status(404).json({ message: '该手机号未注册' });

    try {
        await sendSmsCode(phone);
        res.json({ message: '验证码已发送' });
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/reset-password', async (req, res) => {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) return res.status(400).json({ message: '请填写所有必填项' });

    const valid = await verifySmsCode(phone, code);
    if (!valid) return res.status(400).json({ message: '验证码错误或已过期' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
        where: { phone },
        data: { password: hashedPassword, lockedUntil: null, failedLoginAttempts: 0 }
    });

    res.json({ message: '密码重置成功，请重新登录' });
});

router.post('/verify-code', async (req, res) => {
    // Registration with code verification
    const { phone, code, username, password } = req.body;
    
    if (!phone || !code || !username || !password) {
        return res.status(400).json({ message: '请填写所有必填项' });
    }

    const valid = await verifySmsCode(phone, code);
    if (!valid) return res.status(400).json({ message: '验证码错误或已过期' });

    try {
        const existing = await prisma.user.findFirst({
            where: { OR: [{ username }, { phone }] }
        });
        if (existing) {
             if (existing.username === username) return res.status(400).json({ message: '该用户名已存在' });
             if (existing.phone === phone) return res.status(400).json({ message: '该手机号已注册' });
             return res.status(400).json({ message: '用户名或手机号已存在' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashedPassword, phone }
        });
        
        res.status(201).json({ message: '注册成功', userId: user.id });
    } catch (e: any) {
        res.status(500).json({ message: '注册失败', error: e.message });
    }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, phone } = req.body;
    if (!username || !password || !phone) {
      return res.status(400).json({ message: '请填写用户名、密码和手机号' });
    }

    const existingByUsername = await prisma.user.findUnique({ where: { username } });
    if (existingByUsername) {
      return res.status(400).json({ message: '该用户名已存在' });
    }
    const existingByPhone = await prisma.user.findFirst({ where: { phone } });
    if (existingByPhone) {
      return res.status(400).json({ message: '该手机号已注册' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 使用单次创建操作替代先创建后更新，避免潜在的竞态条件
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        phone
      },
    });

    res.status(201).json({ message: '注册成功', userId: user.id });
  } catch (error: any) {
    console.error('Registration error details:', error);
    
    // 根据错误类型返回具体信息
    if (error.code === 'P2002') {
      // 唯一约束冲突
      if (error.meta?.target?.includes('username')) {
        return res.status(400).json({ message: '该用户名已存在' });
      } else if (error.meta?.target?.includes('phone')) {
        return res.status(400).json({ message: '该手机号已注册' });
      }
      return res.status(400).json({ message: '用户名或手机号已存在' });
    } else if (error.code === 'P2025') {
      return res.status(404).json({ message: '数据库记录未找到' });
    } else if (error.code.startsWith('E')) {
      // Node.js 系统错误
      return res.status(500).json({ message: '系统错误', error: error.message });
    }
    
    // 其他未知错误
    res.status(500).json({ message: '注册失败', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } }) as any;

    if (!user) return res.status(400).json({ message: '账号或密码错误' });

    if (user.status === 'BANNED') {
        return res.status(403).json({ message: '该账号已被封禁' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      return res.status(423).json({
        message: `账号已锁定，请${LOCKOUT_MINUTES}分钟后再试，或使用短信验证码重置密码`
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
          message: `您已连续输错${LOCKOUT_THRESHOLD}次密码，账号将锁定${LOCKOUT_MINUTES}分钟。建议使用短信验证码找回密码。`
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: attempts } as any
        });
      }
      return res.status(400).json({ message: '账号或密码错误' });
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
