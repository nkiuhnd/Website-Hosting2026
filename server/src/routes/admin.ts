import { Router, Response, Request, NextFunction } from 'express';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import fs from 'fs-extra';
import bcrypt from 'bcryptjs';
import { resolveProjectFromUrl, resolveInfoFromUrl } from '../utils/projectResolver';

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

import { sendSmsCode, verifySmsCode } from '../utils/sms';

// Middleware to check if user is admin
const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

router.use(authenticateToken, isAdmin);

// Send Verification Code for Sensitive Actions
router.post('/send-verify-code', async (req: Request, res: Response) => {
    try {
        const adminPhone = process.env.ADMIN_PHONE;
        if (!adminPhone) {
            return res.status(500).json({ message: 'Admin phone not configured' });
        }
        await sendSmsCode(adminPhone);
        res.json({ message: 'Verification code sent' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Failed to send code' });
    }
});

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

        // Visits today
        const visitsToday = await prisma.visitLog.count({
            where: { createdAt: { gte: startOfDay } }
        });

        // Chart Data (Last 7 days)
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            const nextDate = new Date(date);
            nextDate.setDate(date.getDate() + 1);

            const [visits, users, projects] = await Promise.all([
                prisma.visitLog.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
                prisma.user.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
                prisma.project.count({ where: { createdAt: { gte: date, lt: nextDate } } })
            ]);

            chartData.push({
                date: `${date.getMonth() + 1}/${date.getDate()}`,
                visits,
                users,
                projects
            });
        }

        res.json({
            totalUsers,
            totalProjects,
            totalVisits: totalVisits._sum.visitCount || 0,
            visitsToday,
            totalStorage: totalStorage._sum.size || 0,
            activeUsersToday,
            currentActiveUsers,
            chartData
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/announcements', async (req: Request, res: Response) => {
    try {
        const title = String(req.body?.title || '').trim() || '系统公告';
        const content = String(req.body?.content || '').trim();
        if (!content) return res.status(400).json({ message: '公告内容不能为空' });

        const users = await prisma.user.findMany({ select: { id: true } });
        if (users.length === 0) {
            return res.json({ message: 'No users', count: 0 });
        }

        await prisma.message.createMany({
            data: users.map(user => ({
                userId: user.id,
                title,
                content,
                type: 'announcement'
            }))
        });

        res.json({ message: 'Announcement sent', count: users.length });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Send message to specific user
router.post('/send-message', async (req: Request, res: Response) => {
    try {
        const { userId, title, content, type } = req.body;
        
        console.log('Send message request:', { userId, title, type });
        
        if (!userId || !content) {
            return res.status(400).json({ message: 'userId and content are required' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await prisma.message.create({
            data: {
                userId,
                title: title || '站内信',
                content,
                type: type || 'user'
            }
        });

        res.json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Recent Visits
router.get('/visit-logs', async (req: Request, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const { search, projectId, startDate, endDate, ip, projectName, username } = req.query;

        const whereClause: any = {};
        
        // Legacy search (fuzzy) - kept for backward compatibility if needed, 
        // but if specific fields are provided, they take precedence or combine.
        if (search) {
            whereClause.OR = [
                { ip: { contains: String(search) } },
                { project: { name: { contains: String(search) } } }
            ];
        }

        // Granular filters
        if (ip) {
            whereClause.ip = { contains: String(ip) };
        }

        if (projectId) {
            whereClause.projectId = String(projectId);
        }

        if (projectName || username) {
             whereClause.project = whereClause.project || {};
             
             if (projectName) {
                 whereClause.project.name = String(projectName);
             }
             if (username) {
                 whereClause.project.user = { username: String(username) };
             }
        }

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) {
                const start = new Date(String(startDate));
                if (!isNaN(start.getTime())) {
                    whereClause.createdAt.gte = start;
                }
            }
            if (endDate) {
                const end = new Date(String(endDate));
                if (!isNaN(end.getTime())) {
                    // Set end date to end of day if it's just a date string, or use as is
                    // Assuming ISO string or date string. If just date, we want end of that day.
                    // But usually clients send exact ISO strings. Let's just use it directly.
                    whereClause.createdAt.lte = end;
                }
            }
        }

        const [logs, total] = await prisma.$transaction([
            prisma.visitLog.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    project: {
                        select: {
                            name: true,
                            user: {
                                select: { username: true }
                            }
                        }
                    }
                }
            }),
            prisma.visitLog.count({ where: whereClause })
        ]);

        res.json({
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get visit logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Users with stats
router.get('/users', async (req: Request, res: Response) => {
    try {
        const { sortBy, order, search, page, limit, lastActiveAfter, minStorage, maxStorage, minProjectCount, maxProjectCount } = req.query;

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 50;
        const skip = (pageNum - 1) * limitNum;
        const fetchAll = limit === 'all';
        const needsInMemoryFilter = minStorage || maxStorage || minProjectCount || maxProjectCount;

        const whereClause: any = {};
        if (search) {
            whereClause.OR = [
                { username: { contains: String(search) } },
                { phone: { contains: String(search) } },
                { school: { contains: String(search) } }
            ];
        }

        if (lastActiveAfter) {
             const date = new Date(String(lastActiveAfter));
             if (!isNaN(date.getTime())) {
                 whereClause.lastActiveAt = { gte: date };
             }
        }
        
        // Note: Storage and Project Count filtering is done in memory to keep Prisma usage simple
        // especially since totalSize is an aggregation result.

        const orderByClause: any = {};
        if (sortBy) {
             // Handling simple fields sorting
             if (['createdAt', 'lastLoginAt', 'username', 'lastActiveAt', 'school'].includes(String(sortBy))) {
                orderByClause[String(sortBy)] = order === 'asc' ? 'asc' : 'desc';
             }
        } else {
            orderByClause.createdAt = 'desc';
        }

        // If filtering by storage or project count, we fetch all matching users first
        
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
            orderBy: Object.keys(orderByClause).length > 0 ? orderByClause : undefined,
            skip: (fetchAll || needsInMemoryFilter) ? undefined : skip,
            take: (fetchAll || needsInMemoryFilter) ? undefined : limitNum,
        });

        let usersWithStats = users.map((user: any) => ({
            id: user.id,
            username: user.username,
            phone: user.phone,
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

        // Filter by Storage
        if (minStorage) {
            const minBytes = Number(minStorage) * 1024 * 1024; // MB to Bytes
            usersWithStats = usersWithStats.filter((u: any) => u.totalSize >= minBytes);
        }
        if (maxStorage) {
            const maxBytes = Number(maxStorage) * 1024 * 1024; // MB to Bytes
            usersWithStats = usersWithStats.filter((u: any) => u.totalSize <= maxBytes);
        }

        // Filter by Project Count
        if (minProjectCount) {
            const min = Number(minProjectCount);
            usersWithStats = usersWithStats.filter((u: any) => u.projectCount >= min);
        }
        if (maxProjectCount) {
            const max = Number(maxProjectCount);
            usersWithStats = usersWithStats.filter((u: any) => u.projectCount <= max);
        }

        // In-memory sort for calculated fields
        if (sortBy === 'projectCount' || sortBy === 'totalSize') {
            usersWithStats.sort((a: any, b: any) => {
                const valA = a[String(sortBy)];
                const valB = b[String(sortBy)];
                return order === 'asc' ? valA - valB : valB - valA;
            });
        }

        // If we fetched all (due to storage/project filter or export), we need to paginate manually now
        const total = needsInMemoryFilter ? usersWithStats.length : await prisma.user.count({ where: whereClause });
        
        if (needsInMemoryFilter && !fetchAll) {
            usersWithStats = usersWithStats.slice(skip, skip + limitNum);
        }

        res.json({
            data: usersWithStats,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        console.error('Get users error:', error);
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
        const { sortBy, order, search, userId, page, limit, minVisits, createdAfter } = req.query;

        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 50;
        const skip = (pageNum - 1) * limitNum;
        const fetchAll = limit === 'all';

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
        if (minVisits) {
            whereClause.visitCount = { gte: Number(minVisits) };
        }
        if (createdAfter) {
            const date = new Date(String(createdAfter));
            if (!isNaN(date.getTime())) {
                whereClause.createdAt = { gte: date };
            }
        }

        const orderByClause: any = {};
        if (sortBy) {
            orderByClause[String(sortBy)] = order === 'asc' ? 'asc' : 'desc';
        } else {
            orderByClause.createdAt = 'desc';
        }

        const [projects, total] = await prisma.$transaction([
            prisma.project.findMany({
                where: whereClause,
                include: {
                    user: {
                        select: { username: true }
                    }
                },
                orderBy: orderByClause,
                skip: fetchAll ? undefined : skip,
                take: fetchAll ? undefined : limitNum
            }),
            prisma.project.count({ where: whereClause })
        ]);

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

        res.json({
            data: projectsWithUrl,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (error) {
        console.error('Get projects error:', error);
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

// Toggle User Status (Ban/Unban)
router.patch('/users/:id/status', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = req.body; // ACTIVE or BANNED

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'ADMIN') return res.status(400).json({ message: 'Cannot ban admin user' });

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { status }
        });
        res.json(updatedUser);
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const verifyCode = req.headers['x-verify-code'] as string;

        if (!verifyCode) {
            return res.status(400).json({ message: 'Verification code required' });
        }

        const adminPhone = process.env.ADMIN_PHONE;
        if (!adminPhone) {
            return res.status(500).json({ message: 'Admin phone not configured' });
        }

        const isValid = await verifySmsCode(adminPhone, verifyCode);
        if (!isValid) {
            return res.status(403).json({ message: 'Invalid or expired verification code' });
        }

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

// --- Report Management ---

// Get all reports
router.get('/reports', async (req: Request, res: Response) => {
    try {
        const reports = await prisma.report.findMany({
            orderBy: { createdAt: 'desc' },
            // Manually fetch project info since schema relation might be tricky or missing
            // But actually we can just fetch all reports and then enhance them
        });
        
        // Enhance reports with project and user violation stats
        const enhancedReports = await Promise.all(reports.map(async (report) => {
            let projectId = report.projectId;
            let resolvedUser = null;

            if (!projectId && report.targetUrl) {
                const info = await resolveInfoFromUrl(report.targetUrl);
                projectId = info.projectId;
                resolvedUser = info.user;

                if (projectId) {
                    await prisma.report.update({
                        where: { id: report.id },
                        data: { projectId }
                    });
                }
            }

            let projectInfo = null;
            let userViolationCount = 0;
            let projectOwner = null;

            if (projectId) {
                let project = await prisma.project.findUnique({
                    where: { id: projectId },
                    include: { user: true }
                });

                if (project && report.status === 'HANDLED' && project.status !== 'DISABLED') {
                    project = await prisma.project.update({
                        where: { id: projectId },
                        data: { status: 'DISABLED' },
                        include: { user: true }
                    });
                }

                if (project) {
                    projectInfo = {
                        name: project.name,
                        status: project.status
                    };
                    projectOwner = {
                        id: project.user.id,
                        username: project.user.username,
                        status: project.user.status
                    };

                    userViolationCount = await prisma.project.count({
                        where: {
                            userId: project.user.id,
                            status: 'DISABLED'
                        }
                    });
                }
            } else if (resolvedUser) {
                 // Fallback: User identified from URL but project not found
                 projectOwner = {
                     id: resolvedUser.id,
                     username: resolvedUser.username,
                     status: resolvedUser.status
                 };
                 userViolationCount = await prisma.project.count({
                     where: {
                         userId: resolvedUser.id,
                         status: 'DISABLED'
                     }
                 });
            }
            
            return {
                ...report,
                projectId, // Return resolved projectId
                project: projectInfo,
                user: projectOwner,
                userViolationCount
            };
        }));

        res.json(enhancedReports);
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update report status
router.patch('/reports/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = req.body; // HANDLED, DISMISSED, PENDING

        // Get the report first to check targetUrl
        const existingReport = await prisma.report.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingReport) {
            return res.status(404).json({ message: 'Report not found' });
        }

        let projectId = existingReport.projectId;
        if (!projectId && existingReport.targetUrl) {
            console.log(`[Admin] Resolving projectId for report ${id} from URL: ${existingReport.targetUrl}`);
            projectId = await resolveProjectFromUrl(existingReport.targetUrl);
        }

        // If status is HANDLED, we MUST have a project to ban
        if (status === 'HANDLED' && !projectId) {
            console.error(`[Admin] Cannot confirm violation: Could not resolve project from URL ${existingReport.targetUrl}`);
            return res.status(400).json({ message: '无法识别被举报的项目，请手动禁用该项目' });
        }

        // Update the report status
        const report = await prisma.report.update({
            where: { id: parseInt(id) },
            data: { 
                status,
                projectId: projectId // Save the resolved projectId back to the report
            }
        });

        // If status is HANDLED, it means the violation is confirmed -> Disable the project
        if (status === 'HANDLED' && projectId) {
              console.log(`[Admin] Banning project ${projectId} for report ${id}`);
              const project = await prisma.project.update({
                  where: { id: projectId },
                  data: { status: 'DISABLED' },
                  include: { user: true }
              }).catch(err => {
                  console.error('[Admin] Failed to disable project:', err);
                  return null;
              });

              if (project) {
                  console.log(`[Admin] Successfully disabled project ${project.name}. Sending notification to user ${project.userId}`);
                  // Send a system message to the user
                  await prisma.message.create({
                      data: {
                          userId: project.userId,
                          title: '项目已被禁用',
                          content: `您的项目 "${project.name}" 因违规举报已被管理员禁用。如有疑问请联系管理员。`,
                          type: 'system'
                      }
                  }).catch(err => console.error('[Admin] Failed to send notification message:', err));
              }
        }

        // If status is DISMISSED or PENDING, we might want to ensure project is ACTIVE?
        // User requirement: "第二，不处理，经过审查该网页没有问题。" -> This implies we leave it as is or ensure it's active.
        // But if it was previously DISABLED, should we re-enable it? 
        // Let's be safe: If DISMISSED, we don't automatically re-enable because it might have been disabled for other reasons.
        // But if the workflow is: PENDING -> HANDLED (Disabled) -> Oops mistake -> DISMISSED (Enable?)
        // For now, let's only strictly implement the "HANDLED -> Disable" logic as requested. 
        // Re-enabling usually requires manual intervention or explicit "Enable" action to avoid security holes.
        
        res.json(report);
    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
