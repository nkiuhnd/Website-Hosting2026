import { Request } from 'express';
import prisma from '../prisma';

export const resolveProjectFromUrl = async (url: string): Promise<string | null> => {
    try {
        console.log(`[Resolver] Attempting to resolve URL: ${url}`);
        const urlObj = new URL(url, 'http://localhost');
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;

        let username: string | null = null;
        let projectName: string | null = null;

        const rawMainDomain = String(process.env.MAIN_DOMAIN || '').trim();
        const normalizedMainDomain = rawMainDomain
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split(':')[0];
        console.log(`[Resolver] Hostname: ${hostname}, MainDomain: ${normalizedMainDomain}`);

        // 1. Path based: /sites/:username/:projectName
        const sitesMatch = pathname.match(/^\/sites\/([^/]+)\/([^/]+)/);
        if (sitesMatch) {
            username = decodeURIComponent(sitesMatch[1]);
            projectName = decodeURIComponent(sitesMatch[2]);
            console.log(`[Resolver] Path match: username=${username}, project=${projectName}`);
        } 
        // 2. Subdomain based
        else {
            // Check if subdomain exists
            let parts = hostname.split('.');
            
            // Handle localhost or IP (Exact match)
            if (hostname === 'localhost' || hostname === '127.0.0.1' || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
                console.log(`[Resolver] Direct IP/Localhost access, no subdomain`);
            } else {
                 // Production domain
                 if (normalizedMainDomain && hostname.endsWith(normalizedMainDomain)) {
                     const sub = hostname.replace(`.${normalizedMainDomain}`, '');
                     if (sub && sub !== 'www') {
                         username = sub;
                         console.log(`[Resolver] Subdomain match (mainDomain): ${username}`);
                     }
                 } else {
                     // Fallback generic subdomain check
                     // user.domain.com (3 parts) OR user.localhost (2 parts)
                     if (parts.length >= 2) {
                         // Exclude www
                         if (parts[0] !== 'www') {
                             username = parts[0];
                             console.log(`[Resolver] Subdomain fallback match: ${username}`);
                         }
                     }
                 }
            }

            // For subdomain access, project name is the first part of the path
            if (username) {
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length > 0) {
                    projectName = decodeURIComponent(pathParts[0]);
                    console.log(`[Resolver] Project from path: ${projectName}`);
                }
            }
        }

        if (username && projectName) {
            const user = await prisma.user.findUnique({ where: { username } });
            if (user) {
                const project = await prisma.project.findFirst({
                    where: { userId: user.id, name: projectName }
                });
                if (project) {
                    console.log(`[Resolver] SUCCESS: Resolved to ProjectID ${project.id}`);
                    return project.id;
                }
                console.log(`[Resolver] Project '${projectName}' not found for user '${username}'`);
            } else {
                console.log(`[Resolver] User '${username}' not found`);
            }
        }
    } catch (error) {
        console.error('[Resolver] Error resolving project from URL:', error);
    }
    console.log(`[Resolver] FAILED to resolve URL`);
    return null;
};
