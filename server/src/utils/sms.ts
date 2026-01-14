import Dypnsapi20170525, * as $Dypnsapi20170525 from '@alicloud/dypnsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import Credential from '@alicloud/credentials';
import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => console.error('Redis Error:', err));

let client: Dypnsapi20170525 | null = null;

try {
  if (process.env.ALIYUN_ACCESS_KEY_ID && process.env.ALIYUN_ACCESS_KEY_SECRET) {
    // 优先使用环境变量中的 AK/SK 初始化 Credential
    const credential = new Credential({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      type: 'access_key'
    } as any);
    
    const config = new $OpenApi.Config({
      credential: credential,
    });
    // 号码认证服务的 Endpoint
    config.endpoint = 'dypnsapi.aliyuncs.com';
    client = new Dypnsapi20170525(config);
  }
} catch (e) {
  console.error('Failed to init SMS client:', e);
}

export async function sendSmsCode(phone: string, templateCode: string = process.env.ALIYUN_SMS_TEMPLATE_CODE!): Promise<boolean> {
  const rateKey = `sms:rate:${phone}`;

  // Limit check
  const [minRes, hourRes] = await Promise.all([
    redis.incr(`${rateKey}:min`),
    redis.incr(`${rateKey}:hour`)
  ]);

  if (minRes === 1) await redis.expire(`${rateKey}:min`, 60);
  if (hourRes === 1) await redis.expire(`${rateKey}:hour`, 3600);

  if (minRes > 3) throw new Error('发送过于频繁，请60秒后重试');
  if (hourRes > 10) throw new Error('今日发送次数已达上限');

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Mock mode if no client or specifically disabled
  if (!client) {
      console.warn('================================================================');
      console.warn('[SMS MOCK] No Aliyun keys or client init failed. Mocking send.');
      console.warn(`[SMS MOCK] Phone: ${phone}, Code: ${code}`);
      console.warn('================================================================');
      await redis.set(`sms:code:${phone}`, code, 'EX', 300);
      return true;
  }

  try {
    const request = new $Dypnsapi20170525.SendSmsVerifyCodeRequest({
      phoneNumber: phone,
      signName: process.env.ALIYUN_SMS_SIGN_NAME,
      templateCode: templateCode,
      // 注意：号码认证服务的模板参数是 JSON 字符串，且必须符合模板变量要求
      templateParam: JSON.stringify({ code, min: '5' }),
    });

    const response = await client.sendSmsVerifyCode(request);
    
    if (!response.body) {
      throw new Error('阿里云短信服务未返回响应体');
    }
    
    if (response.body.code !== 'OK') {
      console.error('[SMS Error] Aliyun returned non-OK:', response.body);
      throw new Error(response.body.message || '短信发送失败');
    }

    await redis.set(`sms:code:${phone}`, code, 'EX', 300);

    console.log(`[SMS] Sent to ${phone}. Response: ${response.body.code}`);
    return true;
  } catch (error: any) {
    console.error('[SMS Error]', error);
    throw new Error(error.message || '短信发送失败，请稍后重试');
  }
}

export async function verifySmsCode(phone: string, code: string): Promise<boolean> {
  const stored = await redis.get(`sms:code:${phone}`);
  if (!stored) return false;
  if (stored !== code) return false;

  await redis.del(`sms:code:${phone}`);
  return true;
}
