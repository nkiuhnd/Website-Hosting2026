import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import adminRoutes from './routes/admin';
import prisma from './prisma';
import { createDefaultAdmin } from './utils/initAdmin';

dotenv.config();

const app = express();
const PORT = Number(String(process.env.PORT || '').trim()) || 4000;

// Initialize Admin
createDefaultAdmin();

app.use(morgan('combined')); // Log requests
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust Proxy for getting correct IP
app.set('trust proxy', true);

// Anti-Hotlinking Middleware (Optional: Enable via ENV if needed)
// Blocks requests with Referer that doesn't match current host
const checkReferer = (req: Request, res: Response, next: any) => {
    // Only apply to /sites/ and /api/
    if (!req.path.startsWith('/sites/') && !req.path.startsWith('/api/')) return next();
    
    const referer = req.get('Referer');
    // If no referer (direct access), allow it (user might type url directly)
    if (!referer) return next();

    try {
        const refererHost = new URL(referer).host;
        const currentHost = req.get('host');
        
        // Allow if referer host matches current host (or localhost for dev)
        // Note: This is a basic check. For strict mode, compare against allowed domains list.
        if (currentHost && refererHost !== currentHost && !refererHost.includes('localhost') && !refererHost.includes('127.0.0.1')) {
             console.log(`[Security] Blocked Hotlink from: ${refererHost} to ${req.path}`);
             // return res.status(403).send('Hotlinking forbidden'); 
             // Warn only for now to avoid breaking cpolar/proxies if headers are messy
        }
    } catch (e) {}
    next();
};
app.use(checkReferer);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminRoutes);

const serveProjectFile = async (username: string, projectName: string, filePath: string, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).send('User not found');

    const project = await prisma.project.findFirst({
      where: { userId: user.id, name: projectName }
    });

    if (!project) return res.status(404).send('Project not found');

    if (project.status === 'DISABLED') {
        return res.status(403).send('Project has been disabled by admin');
    }

    // Increment visit count (only for main entry or all? let's do all for now or just index)
    // To be more accurate, maybe only on page load. But simple is fine.
    if (filePath === 'index.html' || filePath === project.entryFile) {
        await prisma.project.update({
            where: { id: project.id },
            data: { visitCount: { increment: 1 } }
        });
    }

    // Security check: prevent directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(project.storagePath, safePath);

    // Double check: ensure absolutePath starts with project.storagePath
    if (!absolutePath.startsWith(project.storagePath)) {
        console.warn(`[Security] Blocked path traversal attempt: ${absolutePath}`);
        return res.status(403).send('Access denied');
    }

    console.log(`[FileCheck] Looking for: ${absolutePath}`);

    // Check if file exists
    if (!await fs.pathExists(absolutePath)) {
        console.log(`[FileCheck] Not Found: ${absolutePath}`);
        return res.status(404).send('File not found');
    }

    // Inject Protection Script for HTML files
    if (absolutePath.endsWith('.html')) {
        let content = await fs.readFile(absolutePath, 'utf-8');
        
        // Anti-download / Anti-local-run script
        // 1. Block file:// protocol
        // 2. Optional: Block localhost/127.0.0.1 in production if needed (commented out for now to allow local dev)
        const protectionScript = `
        <script>
        (function() {
            function blockLocalExecution() {
                if (window.location.protocol === 'file:') {
                    var msg = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#fff;font-size:24px;text-align:center;"><div><h1>禁止本地运行 / Access Denied</h1><p>请通过平台链接访问</p></div></div>';
                    if (document.body) {
                        document.body.innerHTML = msg;
                    }
                    throw new Error('Local execution forbidden');
                }
            }
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                blockLocalExecution();
            } else {
                document.addEventListener('DOMContentLoaded', blockLocalExecution);
            }
        })();
        </script>
        `;

        // Insert before </head> or <body>
        if (content.includes('</head>')) {
            content = content.replace('</head>', `${protectionScript}</head>`);
        } else if (content.includes('<body>')) {
            content = content.replace('<body>', `<body>${protectionScript}`);
        } else {
            content = protectionScript + content;
        }

        return res.send(content);
    }

    res.sendFile(absolutePath);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

app.use('/sites/:username/:projectName', async (req, res, next) => {
    if (req.method !== 'GET') return next();

    // Check if we need to redirect to add trailing slash
    // req.path is relative to the mount point.
    // When mounting at /sites/:u/:p, both /sites/:u/:p and /sites/:u/:p/ result in req.path = '/'
    if (req.path === '/' && !req.originalUrl.split('?')[0].endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }

    // Handle root access: if requesting /sites/:u/:p/, find the correct entry file
    if (req.path === '/') {
        try {
            const user = await prisma.user.findUnique({ where: { username: req.params.username } });
            if (user) {
                const project = await prisma.project.findFirst({
                    where: { userId: user.id, name: req.params.projectName }
                });
                
                if (project && project.entryFile && project.entryFile !== 'index.html') {
                    return res.redirect(req.originalUrl + project.entryFile);
                }
            }
        } catch (e) {
            console.error('Error finding project entry:', e);
        }
    }
    
    // req.path starts with /, e.g., /index.html
    // Ensure path is decoded (Express usually does this, but to be safe for special chars)
    const decodedPath = decodeURIComponent(req.path);
    const filePath = decodedPath === '/' ? 'index.html' : decodedPath.substring(1);
    
    console.log(`[Request] Project: ${req.params.projectName}, Path: ${req.path}, Decoded: ${decodedPath}, FilePath: ${filePath}`);
    
    await serveProjectFile(req.params.username, req.params.projectName, filePath, res);
});

app.use('/:projectName', async (req, res, next) => {
    if (req.method !== 'GET') return next();
    const hostHeader = req.get('host') || '';
    const hostname = hostHeader.split(':')[0];
    const parts = hostname.split('.');
    if (parts.length < 3) return next();
    const username = parts[0];
    const projectName = req.params.projectName;
    if (!username || !projectName) return next();
    if (projectName === 'api' || projectName === 'sites') return next();
    if (req.path === '/' && !req.originalUrl.split('?')[0].endsWith('/')) {
        return res.redirect(req.originalUrl + '/');
    }
    if (req.path === '/') {
        try {
            const user = await prisma.user.findUnique({ where: { username } });
            if (user) {
                const project = await prisma.project.findFirst({
                    where: { userId: user.id, name: projectName }
                });
                if (project && project.entryFile && project.entryFile !== 'index.html') {
                    return res.redirect(req.originalUrl + project.entryFile);
                }
            }
        } catch (e) {
            console.error('Error finding project entry (subdomain):', e);
        }
    }
    const decodedPath = decodeURIComponent(req.path);
    const filePath = decodedPath === '/' ? 'index.html' : decodedPath.substring(1);
    console.log(`[Request] Subdomain user: ${username}, Project: ${projectName}, Path: ${req.path}, Decoded: ${decodedPath}, FilePath: ${filePath}`);
    await serveProjectFile(username, projectName, filePath, res);
});

// Serve React Frontend
const clientBuildPath = path.join(__dirname, '../../client/dist');
// Check if client build exists (sync check is fine on startup/request)
if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    
    // SPA Fallback: Any route not handled by API or /sites returns index.html
    // Note: In Express 5, '*' is not a valid wildcard. Use regex /.*/ or (.*)
    app.get(/.*/, (req, res) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/sites')) {
             return res.status(404).json({ error: 'Not found' });
        }
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    console.log('Warning: Client build not found at:', clientBuildPath);
    console.log('To serve the frontend, run "npm run build" in the client directory.');
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
