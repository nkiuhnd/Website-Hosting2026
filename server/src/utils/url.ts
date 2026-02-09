import { URL } from 'url';

export const buildSiteUrl = (baseUrl: string, username: string, projectName: string, entryFile?: string | null) => {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const entrySuffix = entryFile && entryFile !== 'index.html'
    ? '/' + String(entryFile).split('/').map(encodeURIComponent).join('/')
    : '';

  // Get Main Domain from ENV to decide URL structure
  // This allows generating correct public URLs even if running locally or behind proxy
  const mainDomain = process.env.MAIN_DOMAIN ? process.env.MAIN_DOMAIN.trim() : '';

  // Case 1: No MAIN_DOMAIN set (or explicitly localhost in ENV)
  // Fallback to path-based URL: baseUrl/sites/username/project
  if (!mainDomain || mainDomain.includes('localhost') || mainDomain.includes('127.0.0.1')) {
     return `${trimmedBase}/sites/${encodeURIComponent(username)}/${encodeURIComponent(projectName)}${entrySuffix}`;
  }

  // Case 2: MAIN_DOMAIN is set (e.g. yunmind.cn)
  // Force subdomain structure: scheme://username.mainDomain/project
  // We infer scheme from baseUrl
  let protocol = 'http:';
  try {
      const urlObj = new URL(trimmedBase);
      protocol = urlObj.protocol;
  } catch (e) {}

  return `${protocol}//${encodeURIComponent(username)}.${mainDomain}/${encodeURIComponent(projectName)}${entrySuffix}`;
};
