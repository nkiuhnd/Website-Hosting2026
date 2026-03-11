
interface IPLocationResponse {
  status: string;
  regionName?: string;
  city?: string;
}

export async function getLocationFromIP(ip: string): Promise<{ province: string; city: string }> {
  try {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      return { province: '本地', city: '本地' };
    }

    const response = await fetch(`http://ip-api.com/json/${ip}?fields=regionName,city,status`);
    const data = await response.json() as IPLocationResponse;

    if (data.status === 'success') {
      return {
        province: data.regionName || '',
        city: data.city || ''
      };
    }

    return { province: '', city: '' };
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    return { province: '', city: '' };
  }
}
