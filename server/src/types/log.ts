import { z } from 'zod';

/**
 * 请求日志 Schema - 定义写入 D1 数据库的日志字段结构
 *
 * 字段说明：
 * - id: 日志唯一标识，使用请求 ID（requestId）
 * - requestPath / requestMethod: 请求的路径和 HTTP 方法
 * - statusCode: 响应状态码
 * - duration: 请求处理耗时（毫秒）
 * - requestBody / responseBody: 请求体和响应体的脱敏副本
 * - errorMessage: 捕获的异常信息（如有）
 * - clientIp / userAgent: 客户端 IP 和 User-Agent
 * - aiParsed / aiModel / aiProcessingTime: AI 解析相关元数据（可选）
 */
export const RequestLogSchema = z.object({
  id: z.string(),
  requestPath: z.string(),
  requestMethod: z.string(),
  statusCode: z.number(),
  duration: z.number(),
  requestBody: z.string().nullable(),
  responseBody: z.string().nullable(),
  errorMessage: z.string().nullable(),
  clientIp: z.string().nullable(),
  userAgent: z.string().nullable(),
  timestamp: z.date(),
  aiParsed: z.boolean().nullable(),
  aiModel: z.string().nullable(),
  aiProcessingTime: z.number().nullable(),
});

export type RequestLog = z.infer<typeof RequestLogSchema>;

/**
 * 通用 API 响应包装器
 *
 * 统一所有 API 响应格式，包含：
 * - requestId: 请求追踪 ID，便于关联日志
 * - data: 业务数据（可选，错误时不存在）
 * - error: 错误信息（可选，成功时不存在）
 *
 * @param dataSchema - 业务数据的 Zod Schema，用于类型推导
 */
export function ApiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    requestId: z.string(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });
}

export type ApiResponse<T> = {
  requestId: string;
  data?: z.infer<T>;
  error?: string;
};
