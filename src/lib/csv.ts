import { dayKey, timeLabel } from './format';
import type { ProfileData } from './store';

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// All transactions of the profile as a spreadsheet-friendly CSV, oldest first.
export function buildCsv({ txns, accounts, categories }: ProfileData, now: number): string {
  const lines = [['Date', 'Time', 'Account', 'Type', 'Amount', 'Category', 'Remark', 'Status']];
  for (const t of [...txns].reverse()) {
    const when = new Date(t.occurs_at);
    lines.push([
      dayKey(when),
      timeLabel(when),
      accounts.find((a) => a.id === t.account_id)?.name ?? '',
      t.type,
      (t.type === 'income' ? t.amount : -t.amount).toFixed(2),
      categories.find((c) => c.id === t.category_id)?.name ?? '',
      t.memo,
      when.getTime() <= now ? 'Counted' : 'Upcoming',
    ]);
  }
  // The leading BOM makes Excel read ₹ and other non-English text correctly.
  return '﻿' + lines.map((l) => l.map(cell).join(',')).join('\r\n');
}
