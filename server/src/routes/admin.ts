import { Router, Response, Request, NextFunction } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import fs from 'fs-extra';
import bcrypt from 'bcryptjs';

const router = Router();

const buildSiteUrl = (baseUrl: string, username: string, projectName: string, entryFile?: string | null) => {
    const trimmedBase = baseUrl.replace(/\/$/, '');
    const entrySuffix = entryFile && entryFile !== 'index.html'
        ? '/' + String(entryFile).split('/').map(encodeURIComponent).join('/')
        : '';
    let urlObj: URL;
    try {
        urlObj = new URL(trimmedBase);
    } catch {
        return `${trimmedBase}/sites/${encodeURIComponent(username)}/${encodeURIComponent(projectName)}${entrySuffix}`;
    }
    const hostname = urlObj.hostname;
    const protocol = urlObj.protocol;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
    if (isLocalhost || isIp) {
        return `${trimmedBase}/sites/${encodeURIComponent(username)}/${encodeURIComponent(projectName)}${entrySuffix}`;
    }
    const parts = hostname.split('.');
    if (parts.length < 2) {
        return `${trimmedBase}/sites/${encodeURIComponent(username)}/${encodeURIComponent(projectName)}${entrySuffix}`;
    }
    const rootDomain = parts.slice(-2).join('.');
    const siteBase = `${protocol}//${encodeURIComponent(username)}.${rootDomain}`;
    return `${siteBase}/${encodeURIComponent(projectName)}${entrySuffix}`;
};

// Middleware to check if user is admin
const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

router.use(authenticateToken, isAdmin);

// Get Dashboard Stats
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const totalUsers = await prisma.user.count();
        const totalProjects = await prisma.project.count();
        const totalVisits = await prisma.project.aggregate({
            _sum: { visitCount: true }
        });
        const totalStorage = await prisma.project.aggregate({
            _sum: { size: true }
        });
        
        // Active users today (logged in since midnight)
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        const activeUsersToday = await prisma.user.count({
            where: { lastLoginAt: { gte: startOfDay } }
        });

        // Current active users (last 5 mins)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const currentActiveUsers = await prisma.user.count({
            where: { lastActiveAt: { gte: fiveMinsAgo } }
        });

        res.json({
            totalUsers,
            totalProjects,
            totalVisits: totalVisits._sum.visitCount || 0,
            totalStorage: totalStorage._sum.size || 0,
            activeUsersToday,
            currentActiveUsers
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Users with stats
router.get('/users', async (req: Request, res: Response) => {
    try {
        const { sortBy, order, search } = req.query;

        const whereClause: any = {};
        if (search) {
            whereClause.username = { contains: String(search) };
        }

        const orderByClause: any = {};
        if (sortBy) {
             // Handling simple fields sorting
             if (['createdAt', 'lastLoginAt', 'username'].includes(String(sortBy))) {
                orderByClause[String(sortBy)] = order === 'asc' ? 'asc' : 'desc';
             }
             // Note: Sorting by calculated fields (projectCount, totalSize) is complex in Prisma directly
             // We will sort in memory for these specific fields if requested
        } else {
            orderByClause.createdAt = 'desc';
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { projects: true }
                },
                projects: {
                    select: { size: true }
                }
            },
            orderBy: Object.keys(orderByClause).length > 0 ? orderByClause : undefined
        });

        let usersWithStats = users.map((user: any) => ({
            id: user.id,
            username: user.username,
            role: user.role,
            status: user.status,
            lastLoginAt: user.lastLoginAt,
            lastLoginIp: user.lastLoginIp,
            lastActiveAt: user.lastActiveAt,
            province: user.province,
            city: user.city,
            school: user.school,
            createdAt: user.createdAt,
            projectCount: user._count.projects,
            totalSize: user.projects.reduce((acc: number, p: any) => acc + p.size, 0)
        }));

        // In-memory sort for calculated fields
        if (sortBy === 'projectCount' || sortBy === 'totalSize') {
            usersWithStats.sort((a: any, b: any) => {
                const valA = a[String(sortBy)];
                const valB = b[String(sortBy)];
                return order === 'asc' ? valA - valB : valB - valA;
            });
        }

        res.json(usersWithStats);
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Toggle User Status (Ban/Unban)
router.patch('/users/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = req.body; // ACTIVE or BANNED

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'User not found' });

        const user = await prisma.user.update({
            where: { id },
            data: { status }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Projects with details
router.get('/projects', async (req: Request, res: Response) => {
    try {
        const { sortBy, order, search, userId } = req.query;

        const whereClause: any = {};
        if (search) {
            whereClause.OR = [
                { name: { contains: String(search) } },
                { description: { contains: String(search) } },
                { user: { username: { contains: String(search) } } }
            ];
        }
        if (userId) {
            whereClause.userId = String(userId);
        }

        const orderByClause: any = {};
        if (sortBy) {
            orderByClause[String(sortBy)] = order === 'asc' ? 'asc' : 'desc';
        } else {
            orderByClause.createdAt = 'desc';
        }

        const projects = await prisma.project.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { username: true }
                }
            },
            orderBy: orderByClause
        });
        const baseUrl = String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host') || 'localhost'}`).replace(/\/$/, '');
        const projectsWithUrl = projects.map((p: any) => {
            const siteUrl = buildSiteUrl(
                baseUrl,
                p.user.username,
                p.name,
                p.entryFile
            );
            return { ...p, siteUrl };
        });
        res.json(projectsWithUrl);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Toggle Project Status (Disable/Enable)
router.patch('/projects/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = req.body; // ACTIVE or DISABLED

        const existing = await prisma.project.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ message: 'Project not found' });

        const project = await prisma.project.update({
            where: { id },
            data: { status }
        });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'ADMIN') return res.status(400).json({ message: 'Cannot delete admin user' });
        
        const projects = await prisma.project.findMany({ where: { userId: id } });
        
        // 1. Delete project files
        for (const p of projects) {
            if (p.storagePath) {
                try {
                    if (await fs.pathExists(p.storagePath)) {
                        await fs.remove(p.storagePath);
                    }
                } catch (err) {
                    console.error(`Failed to delete storage for project ${p.id}:`, err);
                }
            }
        }

        // 2. Explicitly delete projects from DB
        await prisma.project.deleteMany({ where: { userId: id } });

        // 3. Delete user
        await prisma.user.delete({ where: { id } });
        
        res.json({ message: 'User deleted' });
    } catch (error: any) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.patch('/users/:id/reset-password', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ message: 'newPassword is required' });
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'ADMIN') return res.status(400).json({ message: 'Cannot reset admin password' });
        const hashed = await bcrypt.hash(String(newPassword), 10);
        await prisma.user.update({ where: { id }, data: { password: hashed } });
        res.json({ message: 'Password reset' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
