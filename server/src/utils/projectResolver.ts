import { Request } from 'express';
import prisma from '../prisma';

export interface ResolvedInfo {
    projectId: string | null;
    username: string | null;
    user: any | null;
}

export const resolveInfoFromUrl = async (url: string): Promise<ResolvedInfo> => {
    let result: ResolvedInfo = { projectId: null, username: null, user: null };
    
    try {
        console.log(`[Resolver] Attempting to resolve URL: ${url}`);
        const urlObj = new URL(url, 'http://localhost');
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;

        let username: string | null = null;
        let projectName: string | null = null;

        const rawMainDomain = String(process.env.MAIN_DOMAIN || 'yunmind.cn').trim();
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
            if (normalizedMainDomain && hostname.endsWith(normalizedMainDomain)) {
                 const prefix = hostname.substring(0, hostname.length - normalizedMainDomain.length);
                 const cleanPrefix = prefix.replace(/\.$/, '');
                 
                 if (cleanPrefix && cleanPrefix !== 'www') {
                     const parts = cleanPrefix.split('.');
                     username = parts[parts.length - 1]; 
                     console.log(`[Resolver] Subdomain match: ${username}`);
                 }
            } else {
                  // Fallback
                  const parts = hostname.split('.');
                  if (parts.length >= 2 && parts[0] !== 'www') {
                      username = parts[0];
                      console.log(`[Resolver] Subdomain fallback match: ${username}`);
                  }
             }

             if (username) {
                 const pathParts = pathname.split('/').filter(p => p);
                 if (pathParts.length > 0) {
                     projectName = decodeURIComponent(pathParts[0]);
                     console.log(`[Resolver] Project from path: ${projectName}`);
                 }
             }
        }

        result.username = username;

        if (username) {
            const user = await prisma.user.findUnique({ where: { username } });
            if (user) {
                result.user = user;
                if (projectName) {
                    const project = await prisma.project.findFirst({
                        where: { userId: user.id, name: projectName }
                    });
                    if (project) {
                        console.log(`[Resolver] SUCCESS: Resolved to ProjectID ${project.id}`);
                        result.projectId = project.id;
                    } else {
                        console.log(`[Resolver] Project '${projectName}' not found for user '${username}'`);
                    }
                }
            } else {
                console.log(`[Resolver] User '${username}' not found`);
            }
        }
    } catch (error) {
        console.error('[Resolver] Error resolving project from URL:', error);
    }
    
    return result;
};

export const resolveProjectFromUrl = async (url: string): Promise<string | null> => {
    const info = await resolveInfoFromUrl(url);
    return info.projectId;
};
