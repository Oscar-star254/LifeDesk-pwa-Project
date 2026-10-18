export class AppError extends Error {
  constructor(status, message, code = "INVALID_REQUEST") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function cleanText(value, field, { min = 1, max = 255 } = {}) {
  if (typeof value !== "string") throw new AppError(400, `${field} is required`);
  const cleaned = value.trim().replace(/[<>]/g, "");
  if (cleaned.length < min || cleaned.length > max) {
    throw new AppError(400, `${field} must contain ${min}–${max} characters`);
  }
  return cleaned;
}

export function email(value) {
  const normalized = cleanText(value, "Email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError(400, "Enter a valid email address");
  }
  return normalized;
}

export function password(value) {
  if (typeof value !== "string" || value.length < 10 || value.length > 128) {
    throw new AppError(400, "Password must contain 10–128 characters");
  }
  if (!/[a-z]/i.test(value) || !/\d/.test(value)) {
    throw new AppError(400, "Password must contain a letter and a number");
  }
  return value;
}

export function positiveAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 1_000_000_000) {
    throw new AppError(400, "Amount must be greater than zero");
  }
  return Math.round(number * 100);
}

export function validateSplitRules(accounts) {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    throw new AppError(400, "Create at least one money account");
  }
  const total = accounts.reduce((sum, account) => sum + Number(account.percentage), 0);
  if (accounts.some((account) => !Number.isInteger(Number(account.percentage)) || Number(account.percentage) < 0)) {
    throw new AppError(400, "Account percentages must be whole, non-negative numbers");
  }
  if (total !== 100) throw new AppError(400, `Account percentages total ${total}%, not 100%`);
  return true;
}

export function splitIncome(amountCents, accounts) {
  validateSplitRules(accounts);
  const ordered = accounts.map((account) => ({
    accountId: account.id,
    amountCents: Math.floor((amountCents * Number(account.percentage)) / 100),
  }));
  const allocated = ordered.reduce((sum, split) => sum + split.amountCents, 0);
  ordered[0].amountCents += amountCents - allocated;
  return ordered;
}
