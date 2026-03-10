export function formatTimestamp(iso: string, nowIso?: string) {
  const d = new Date(iso);
  const now = nowIso ? new Date(nowIso) : new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  const diffDays = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (diffDays <= 6) {
    return weekdays[d.getDay()];
  }

  return `${months[d.getMonth()]} ${d.getDate()}`;
}

