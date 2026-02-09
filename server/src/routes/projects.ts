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

// 安全防护：禁止上传的危险文件后缀
const BLACKLISTED_EXTENSIONS = [
    // 服务端脚本
    '.php', '.jsp', '.asp', '.aspx', '.py', '.rb', '.pl', '.sh', '.bat', '.cmd', '.ps1',
    // 可执行文件
    '.exe', '.dll', '.so', '.bin', '.msi', '.com', '.vbs',
    // 敏感配置文件
    '.htaccess', '.env', '.git', '.DS_Store', '.sql', '.db'
];

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

// Inject Footer (Watermark)
async function injectFooter(filePath: string) {
    try {
        let html = await fs.readFile(filePath, 'utf-8');
        // Check if footer already exists to avoid duplication (simple check)
        if (html.includes('yunmind.cn </a> 免费托管')) {
            return;
        }

        const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');

        const footer = `
<!-- YunMind Footer -->
<div id="yunmind-footer-container">
  <footer style="position:fixed; bottom:0; left:0; right:0; background:#f9fafb; text-align:center; padding:6px 0; font-size:12px; color:#666; border-top:1px solid #eee; z-index:9999; font-family: sans-serif;">
    本网页由 <a href="https://yunmind.cn" target="_blank" style="color:#3b82f6; text-decoration:none;">yunmind.cn</a> 免费托管 · 拖拽 HTML 秒变公网网站
    <span style="margin-left:12px; color:#ccc;">|</span>
    <a href="javascript:void(0)" onclick="window.showYunMindReport()" style="margin-left:12px; color:#ef4444; text-decoration:none;">违规举报</a>
  </footer>

  <div id="yunmind-report-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:10000; justify-content:center; align-items:center; font-family: sans-serif;">
    <div style="background:#fff; padding:20px; border-radius:8px; width:90%; max-width:400px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
      <h3 style="margin:0 0 15px 0; font-size:18px; color:#333;">违规举报</h3>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-size:14px; color:#666;">举报类别</label>
        <select id="yunmind-report-type" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; outline:none;">
          <option value="政治敏感">政治敏感</option>
          <option value="色情低俗">色情低俗</option>
          <option value="诈骗信息">诈骗信息</option>
          <option value="侵权投诉">侵权投诉</option>
          <option value="其他违规">其他违规</option>
        </select>
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; font-size:14px; color:#666;">具体说明</label>
        <textarea id="yunmind-report-content" rows="4" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; outline:none; resize:none;" placeholder="请详细说明违规原因..."></textarea>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button onclick="window.hideYunMindReport()" style="padding:8px 16px; border:1px solid #ddd; background:#fff; border-radius:4px; cursor:pointer; color:#333;">取消</button>
                <button onclick="window.submitYunMindReport()" id="yunmind-report-submit" style="padding:8px 16px; border:none; background:#ef4444; color:#fff; border-radius:4px; cursor:pointer;">提交举报</button>
              </div>
    </div>
  </div>

  <script>
    window.showYunMindReport = function() {
      document.getElementById('yunmind-report-modal').style.display = 'flex';
    };
    window.hideYunMindReport = function() {
      document.getElementById('yunmind-report-modal').style.display = 'none';
    };
    window.submitYunMindReport = function() {
      const type = document.getElementById('yunmind-report-type').value;
      const content = document.getElementById('yunmind-report-content').value;
      const submitBtn = document.getElementById('yunmind-report-submit');
      
      if (!content.trim()) {
        alert('请填写举报具体说明');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = '提交中...';

      const apiBase = "${baseUrl}" || window.location.origin;
      const apiUrl = apiBase + '/api/reports';

      fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type,
          content: content,
          targetUrl: window.location.href,
          projectId: null
        })
      })
      .then(res => res.json())
      .then(data => {
        alert('举报已收到，我们会尽快处理。');
        window.hideYunMindReport();
      })
      .catch(err => {
        console.error('Report error:', err);
        alert('提交失败，请稍后再试。');
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = '提交举报';
      });
    };
  </script>
</div>
`;
        
        if (html.includes('</body>')) {
             html = html.replace(/<\/body>/i, `${footer}</body>`);
        } else {
             html += footer;
        }
        await fs.writeFile(filePath, html);
    } catch (err) {
        console.error(`Failed to inject footer for ${filePath}:`, err);
    }
}

// Recursively inject footer into all HTML files
async function injectFooterToAllHtml(dir: string) {
    try {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
                await injectFooterToAllHtml(fullPath);
            } else if (file.toLowerCase().endsWith('.html') || file.toLowerCase().endsWith('.htm')) {
                await injectFooter(fullPath);
            }
        }
    } catch (err) {
        console.error(`Failed to process directory for footer injection: ${dir}`, err);
    }
}

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

             // 安全检查：黑名单文件过滤
             const ext = path.extname(entry.entryName).toLowerCase();
             if (BLACKLISTED_EXTENSIONS.includes(ext)) {
                 console.warn(`[Security] Blocked blacklisted file: ${entry.entryName}`);
                 continue; // 跳过该危险文件
             }

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
        
        // Inject footer into all HTML files in the project
        // We can check user preference here if we passed it in req.body
        // For now, default to true or check req.body.showPlatformFooter
        const showFooter = req.body.showPlatformFooter !== 'false'; 
        if (showFooter) {
            await injectFooterToAllHtml(projectDir);
        }

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

        // Inject footer
        const showFooter = req.body.showPlatformFooter !== 'false';
        if (showFooter) {
            await injectFooter(finalPath);
        }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId: user.id,
        storagePath: projectDir,
        entryFile: entryFile,
        size: totalSize,
        // showPlatformFooter is defined in schema and generated client
        showPlatformFooter: req.body.showPlatformFooter !== 'false'
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

// Download Project
router.get('/:id/download', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const user = req.user!;

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id }
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });
    
    if (!project.storagePath || !fs.existsSync(project.storagePath)) {
        return res.status(404).json({ message: 'Project files not found' });
    }

    const zip = new AdmZip();
    zip.addLocalFolder(project.storagePath);
    const buffer = zip.toBuffer();
    
    const fileName = `${project.name}.zip`;
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=${fileName}`);
    res.set('Content-Length', String(buffer.length));
    res.send(buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Project
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = String(req.params.id);
        const userId = req.user!.id;

        const project = await prisma.project.findFirst({
            where: { id, userId }
        });

        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Delete files from storage
        if (project.storagePath && await fs.pathExists(project.storagePath)) {
            await fs.remove(project.storagePath);
        }

        // Delete from database (Cascade will handle versions and visit logs)
        await prisma.project.delete({ where: { id } });

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Project Visit Logs
router.get('/:id/visits', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const projectId = String(req.params.id);
        const userId = req.user!.id;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Verify project ownership
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId }
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const [logs, total] = await prisma.$transaction([
            prisma.visitLog.findMany({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.visitLog.count({ where: { projectId } })
        ]);

        res.json({
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get project visit logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Messages ---

router.post('/messages/send', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const fromUser = req.user!;
        const toUsername = String(req.body?.toUsername || '').trim();
        const title = String(req.body?.title || '').trim();
        const content = String(req.body?.content || '').trim();

        if (!toUsername) return res.status(400).json({ message: '收件人用户名不能为空' });
        if (!content) return res.status(400).json({ message: '内容不能为空' });

        const recipient = await prisma.user.findUnique({ where: { username: toUsername } });
        if (!recipient) return res.status(404).json({ message: '未找到该用户' });
        if (recipient.role === 'ADMIN') {
            return res.status(400).json({ message: '给管理员请使用申诉通道' });
        }

        const finalTitle = title || `来自 ${fromUser.username} 的站内信`;
        const finalContent = `来自 ${fromUser.username}：${content}`;
        const message = await prisma.message.create({
            data: {
                userId: recipient.id,
                title: finalTitle,
                content: finalContent,
                type: 'user'
            }
        });
        res.json(message);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/messages/appeal', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const fromUser = req.user!;
        const title = String(req.body?.title || '').trim();
        const content = String(req.body?.content || '').trim();

        if (!content) return res.status(400).json({ message: '申诉理由不能为空' });

        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { id: true }
        });
        if (admins.length === 0) {
            return res.status(404).json({ message: '未找到管理员账号' });
        }

        const finalTitle = title || '用户申诉';
        const finalContent = `来自 ${fromUser.username} 的申诉：${content}`;
        await prisma.message.createMany({
            data: admins.map(admin => ({
                userId: admin.id,
                title: finalTitle,
                content: finalContent,
                type: 'appeal'
            }))
        });

        res.json({ message: '申诉已发送', count: admins.length });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user messages
router.get('/messages/all', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const messages = await prisma.message.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get unread count
router.get('/messages/unread-count', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const count = await prisma.message.count({
            where: { userId, read: false }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark as read
router.patch('/messages/:id/read', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = String(req.params.id);
        const userId = req.user!.id;
        await prisma.message.updateMany({
            where: { id: parseInt(id, 10), userId },
            data: { read: true }
        });
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark all as read
router.post('/messages/read-all', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const scope = String(req.query.scope || '').trim();
        const whereClause: any = { userId, read: false };
        if (scope === 'user') {
            whereClause.type = 'user';
        } else if (scope === 'system') {
            whereClause.type = { in: ['system', 'announcement'] };
        } else if (scope) {
            whereClause.type = scope;
        }
        await prisma.message.updateMany({
            where: whereClause,
            data: { read: true }
        });
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/messages/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
        const id = parseInt(String(req.params.id), 10);
        const userId = req.user!.id;
        await prisma.message.deleteMany({
            where: { id, userId }
        });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
