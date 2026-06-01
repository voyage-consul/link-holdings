export const getSheetId = (url: string) => {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
};

export const parseDate = (dateStr: any) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s) return null;
  const match = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (match) {
    const d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const normalized = s.replace(/^(\d{4}-\d{2}-\d{2})\s/, '$1T');
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
};

export const formatMonth = (d: Date | null) =>
  d ? `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月` : null;

// 週の開始曜日 (1 = 月曜日)
export const WEEK_START_DAY = 1;

export const getWeekRange = (d: Date | null) => {
  if (!d) return null;
  const day = d.getDay();
  const diff = (day - WEEK_START_DAY + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt: Date) => `${dt.getMonth() + 1}月${dt.getDate()}日`;
  return `${start.getFullYear()}年${fmt(start)}〜${fmt(end)}`;
};

export const formatDay = (d: Date | null) =>
  d ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` : null;

export const hasTag = (val: any) => {
  if (!val) return false;
  const s = String(val).trim();
  return s !== '' && s !== '0';
};

export const isTrue = (val: any) => {
  if (!val) return false;
  const s = String(val).trim();
  return s === '1' || s === '１' || s.toLowerCase() === 'true';
};

export const getFuzzyKey = (keys: string[], keywords: string[], exclude: string[] = []) =>
  keys.find(k => keywords.every(kw => k.includes(kw)) && !exclude.some(ex => k.includes(ex)));
