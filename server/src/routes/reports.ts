import { Router, Request, Response } from 'express';
import prisma from '../prisma';
import { resolveProjectFromUrl } from '../utils/projectResolver';

const router = Router();

// Submit a report
router.post('/', async (req: Request, res: Response) => {
    try {
        const { type, content, targetUrl, projectId } = req.body;
        const finalTargetUrl = String(targetUrl || '').trim() || String(req.get('referer') || '').trim();

        if (!type || !content || !finalTargetUrl) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        let finalProjectId = projectId;
        if (!finalProjectId) {
            finalProjectId = await resolveProjectFromUrl(finalTargetUrl);
        }

        const report = await prisma.report.create({
            data: {
                type,
                content,
                targetUrl: finalTargetUrl,
                projectId: finalProjectId,
                ip: req.ip || req.socket.remoteAddress || 'unknown',
            }
        });

        res.status(201).json({ message: 'Report submitted successfully', id: report.id });
    } catch (error) {
        console.error('Submit report error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
