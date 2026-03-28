export async function deleteLogsOlderThan(env: CloudflareBindings, days: number) {
  // Drizzle mode: 'timestamp' stores milliseconds, unixepoch returns seconds
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const result = await env.DB
    .prepare(`
      DELETE FROM request_logs
      WHERE timestamp < ?
    `)
    .bind(cutoffMs)
    .run();

  return result;
}
