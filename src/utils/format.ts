export function formatDuration(seconds: number): string {
  if (seconds === 0) {
    return 'LIVE';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function createProgressBar(current: number, total: number, length: number = 20): string {
  if (total === 0) {
    return '▬'.repeat(length);
  }

  const progress = Math.floor((current / total) * length);
  const bar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(length - progress);
  return bar;
}
