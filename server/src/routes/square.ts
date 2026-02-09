import { Router } from 'express';
import prisma from '../prisma';
import { authenticateToken, optionalAuthenticateToken, AuthRequest } from '../middlewares/auth';

import { buildSiteUrl } from '../utils/url';

const router = Router();

// Get Public Projects List
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 12;
        const search = req.query.search as string;
        const sort = (req.query.sort as string) || 'latest'; // latest | popular | views

        const where: any = {
            isPublic: true,
            status: 'ACTIVE',
            user: { status: 'ACTIVE' } // Only show active users' projects
        };

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } }
            ];
        }

        let orderBy: any = { createdAt: 'desc' };
        if (sort === 'popular') {
            orderBy = { likes: { _count: 'desc' } };
        } else if (sort === 'views') {
            orderBy = { visitCount: 'desc' };
        }

        const [projects, total] = await prisma.$transaction([
            prisma.project.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy,
                include: {
                    user: { select: { username: true, id: true } },
                    _count: { select: { likes: true, comments: true } }
                }
            }),
            prisma.project.count({ where })
        ]);

        res.json({
            data: projects,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching projects' });
    }
});

// Get Project Detail
router.get('/:id', optionalAuthenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.id;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                user: { select: { username: true, id: true } },
                _count: { select: { likes: true, comments: true } }
            }
        });

        if (!project || !project.isPublic || project.status !== 'ACTIVE') {
            return res.status(404).json({ message: 'Project not found or private' });
        }

        let isLiked = false;
        if (userId) {
            const like = await prisma.like.findUnique({
                where: { userId_projectId: { userId, projectId: id } }
            });
            isLiked = !!like;
        }

        // Construct siteUrl manually if needed, or frontend can handle it
        // The frontend logic usually constructs it from username/name
        const baseUrl = String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host') || 'localhost'}`).replace(/\/$/, '');
        const siteUrl = project.user ? buildSiteUrl(baseUrl, project.user.username, project.name, project.entryFile) : '';

        res.json({ ...project, isLiked, siteUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching project details' });
    }
});

// Toggle Like
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        const userId = req.user!.id;

        const existingLike = await prisma.like.findUnique({
            where: { userId_projectId: { userId, projectId: id } }
        });

        if (existingLike) {
            await prisma.like.delete({
                where: { userId_projectId: { userId, projectId: id } }
            });
            res.json({ liked: false });
        } else {
            await prisma.like.create({
                data: { userId, projectId: id }
            });
            res.json({ liked: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error toggling like' });
    }
});

// Get Comments
router.get('/:id/comments', async (req, res) => {
    try {
        const id = req.params.id as string;
        const comments = await prisma.comment.findMany({
            where: { projectId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { username: true } }
            }
        });
        res.json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching comments' });
    }
});

// Post Comment
router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        const { content } = req.body;
        const userId = req.user!.id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Content cannot be empty' });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                userId,
                projectId: id
            },
            include: {
                user: { select: { username: true } }
            }
        });

        res.json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error posting comment' });
    }
});

export default router;
