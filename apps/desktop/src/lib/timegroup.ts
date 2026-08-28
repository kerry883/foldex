/**
 * Groups items by time period based on a date field.
 * Returns ordered groups: Today, Yesterday, This Week, This Month, {Month Name}, Older
 */

type TimeGroup = {
  label: string;
  items: any[];
};

function getMonthName(date: Date): string {
  return date.toLocaleString("default", { month: "long" });
}

export function groupByTime<T extends { updatedAt: string }>(
  items: T[]
): TimeGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const groups: Map<string, T[]> = new Map();

  for (const item of items) {
    const date = new Date(item.updatedAt);
    let label: string;

    if (date >= today) {
      label = "Today";
    } else if (date >= yesterday) {
      label = "Yesterday";
    } else if (date >= weekAgo) {
      label = "This Week";
    } else if (date >= monthStart) {
      label = "This Month";
    } else {
      // Use month name + year for older items
      const monthName = getMonthName(date);
      const year = date.getFullYear();
      label = year === now.getFullYear() ? monthName : `${monthName} ${year}`;
    }

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(item);
  }

  // Define the order
  const order = ["Today", "Yesterday", "This Week", "This Month"];
  const result: TimeGroup[] = [];

  for (const key of order) {
    if (groups.has(key)) {
      result.push({ label: key, items: groups.get(key)! });
      groups.delete(key);
    }
  }

  // Remaining groups (month names) sorted most recent first
  const remaining = Array.from(groups.entries()).sort((a, b) => {
    const dateA = new Date(a[1][0].updatedAt);
    const dateB = new Date(b[1][0].updatedAt);
    return dateB.getTime() - dateA.getTime();
  });

  for (const [label, items] of remaining) {
    result.push({ label, items });
  }

  return result;
}

/** Format a relative date for card display */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;

  return date.toLocaleDateString("default", { month: "short" });
}
