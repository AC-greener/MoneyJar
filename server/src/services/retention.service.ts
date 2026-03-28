import { deleteLogsOlderThan } from '../repositories/retention.repository';

export async function cleanupOldLogs(env: CloudflareBindings, days: number = 30): Promise<{ deleted: number }> {
  const result = await deleteLogsOlderThan(env, days);
  return { deleted: result.meta.changes ?? 0 };
}
