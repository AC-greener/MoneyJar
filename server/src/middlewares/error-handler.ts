/**
 * 错误处理中间件
 *
 * 职责：
 * - 捕获所有未处理的异常
 * - 统一返回格式化的错误响应
 * - 通过 requestId 关联请求日志，便于排查问题
 *
 * 处理流程：
 * 1. 从上下文获取请求 ID（由其他中间件设置）
 * 2. 记录错误详情到控制台（开发环境可见）
 * 3. 返回 JSON 格式的错误响应，状态码固定为 500
 */
export function createErrorHandler() {
  return async (err: Error, c: any) => {
    // 获取请求 ID，用于关联日志条目
    const requestId = c.get('requestId') || 'unknown';

    // 记录完整错误堆栈，便于调试
    console.error(`[${requestId}] Unhandled error:`, err.message, err.stack);

    // 返回统一格式的错误响应
    return c.json(
      {
        error: err.message || 'Internal Server Error',
        requestId,
      },
      500
    );
  };
}
