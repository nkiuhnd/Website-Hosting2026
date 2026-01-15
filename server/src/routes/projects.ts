import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import prisma from '../prisma';
import { authenticateToken, AuthRequest } from '../middlewares/auth';
import AdmZip from 'adm-zip';
import iconv from 'iconv-lite';

const router = Router();
const MAX_UPLOAD_SIZE_MB = Number(process.env.UPLOAD_MAX_SIZE_MB || '20');
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const MAX_EXTRACT_SIZE_MB = Number(process.env.UPLOAD_MAX_EXTRACT_MB || String(MAX_UPLOAD_SIZE_MB * 5));
const MAX_EXTRACT_SIZE_BYTES = MAX_EXTRACT_SIZE_MB * 1024 * 1024;
const upload = multer({ dest: 'uploads/temp/', limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } });
const uploadSingle = upload.single('file');
const uploadMiddleware = (req: AuthRequest, res: Response, next: any) => {
  uploadSingle(req as any, res as any, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: `文件过大，最大 ${MAX_UPLOAD_SIZE_MB}MB` });
      }
      return res.status(400).json({ message: '上传失败' });
    }
    next();
  });
};

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

// Create Project & Upload
router.post('/', authenticateToken, uploadMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const file = req.file;
    const user = req.user!;

    if (!file || !name) {
      if (file) await fs.unlink(file.path);
      return res.status(400).json({ message: 'File and project name are required' });
    }

    // Check if project exists
    const existing = await prisma.project.findFirst({
      where: { userId: user.id, name }
    });
    if (existing) {
      await fs.unlink(file.path);
      return res.status(400).json({ message: 'Project name already exists' });
    }

    // Define storage path
    // We use userId for directory to avoid collisions and allow changing usernames later if needed
    // Structure: uploads/userId/projectName/
    const projectDir = path.join(process.cwd(), 'uploads', user.id, name);
    await fs.ensureDir(projectDir);

    let entryFile = 'index.html';
    let totalSize = 0;

    // Handle ZIP files
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
        const zip = new AdmZip(file.path);
        const zipEntries = zip.getEntries();
        
        // Security check: Prevent Zip Slip
        // We extract manually to check paths
        for (const entry of zipEntries) {
            // Fix encoding for Chinese filenames (GBK)
            // If entry.entryName looks weird, we might need to fix it.
            // AdmZip automatically decodes using UTF-8, but if the zip was created in GBK environment (Windows), it might be garbled.
            // We use rawEntryName (buffer) to re-decode if necessary.
            
            // Check flags bit 11 (0x800). If set, it's UTF-8. If not, it's likely CP437 or GBK (in Chinese locale).
            // entry.header is internal but usually accessible in JS.
            // However, to be safe, we can try to detect or just assume non-utf8 is GBK for this use case.
            
            // @ts-ignore - header is public in runtime
            const isUtf8 = (entry.header.flags & 0x800) !== 0;
            if (!isUtf8) {
                try {
                    // Try to decode as GBK
                    const gbkName = iconv.decode(entry.rawEntryName, 'gbk');
                    // If decoding worked well, we update entryName.
                    // But wait, adm-zip already decoded it as utf-8 (or cp437).
                    // We need to use gbkName for extraction path.
                    // Since we can't easily change entry.entryName inside adm-zip without side effects,
                    // we will extract manually.
                    entry.entryName = gbkName; 
                } catch (e) {
                    // ignore
                }
            }

            // Validate entry name to prevent directory traversal
            if (entry.entryName.includes('..')) {
                throw new Error('Malicious zip file detected');
            }
        }

        // Manual extraction to ensure we use the potentially fixed entryNames
        // zip.extractAllTo(projectDir, true); // This uses internal names, might be risky if we only changed the property on object
        
        for (const entry of zipEntries) {
             const fullPath = path.join(projectDir, entry.entryName);
             // Prevent Zip Slip again just in case
             if (!fullPath.startsWith(projectDir)) continue;

             if (entry.isDirectory) {
                 await fs.ensureDir(fullPath);
             } else {
                 if (totalSize + entry.header.size > MAX_EXTRACT_SIZE_BYTES) {
                     throw new Error('解压后的内容超出最大限制');
                 }
                 await fs.ensureDir(path.dirname(fullPath));
                 await fs.writeFile(fullPath, entry.getData());
                 totalSize += entry.header.size;
             }
        }
        
        // Calculate total size
        // totalSize is calculated in loop above

        // Try to find index.html in root
        if (!fs.existsSync(path.join(projectDir, 'index.html'))) {
            // Recursive search for index.html
            const findIndexHtml = (dir: string): string | null => {
                const files = fs.readdirSync(dir);
                // Check current dir
                if (files.includes('index.html')) {
                    return path.relative(projectDir, path.join(dir, 'index.html')).replace(/\\/g, '/');
                }
                // Check subdirs
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        const found = findIndexHtml(fullPath);
                        if (found) return found;
                    }
                }
                return null;
            };

            const foundEntry = findIndexHtml(projectDir);
            if (foundEntry) {
                entryFile = foundEntry;
            } else {
                 // Fallback: If no index.html found at all, just point to root or a default 404
                 // For now, let's keep it as index.html so it fails predictably 
                 // or maybe list directory? (not implemented)
            }
        }
        
        // Remove temp zip file
        await fs.unlink(file.path);
    } else {
        // Single HTML file - Strict MIME type check
        if (file.mimetype !== 'text/html') {
            await fs.unlink(file.path);
            return res.status(400).json({ message: 'Only HTML files are allowed for single file upload' });
        }
        
        const finalPath = path.join(projectDir, 'index.html');
        await fs.move(file.path, finalPath, { overwrite: true });
        const stats = await fs.stat(finalPath);
        totalSize = stats.size;
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: user.id,
        storagePath: projectDir,
        entryFile: entryFile,
        size: totalSize
      }
    });

    const baseUrl = String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host') || 'localhost'}`).replace(/\/$/, '');
    const siteUrl = buildSiteUrl(baseUrl, req.user!.username, project.name, project.entryFile);

    res.status(201).json({ ...project, siteUrl });
  } catch (error) {
    console.error(error);
    if (req.file) await fs.remove(req.file.path).catch(() => {});
    const msg = (error as any)?.message || '';
    if ((error as any)?.code === 'LIMIT_FILE_SIZE' || msg.includes('超出最大限制')) {
      return res.status(413).json({ message: `文件过大，最大 ${MAX_UPLOAD_SIZE_MB}MB` });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// List Projects
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { search } = req.query;

    const whereClause: any = { userId: user.id };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { description: { contains: String(search) } }
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    const baseUrl = String(process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host') || 'localhost'}`).replace(/\/$/, '');
    const projectsWithUrl = projects.map((p) => {
      const siteUrl = buildSiteUrl(baseUrl, user.username, p.name, p.entryFile);
      return { ...p, siteUrl };
    });
    res.json(projectsWithUrl);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Project
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const user = req.user!;

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id }
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Delete files
    if (project.storagePath) {
        await fs.remove(project.storagePath);
    }

    // Delete db record
    await prisma.project.delete({ where: { id } });

    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
