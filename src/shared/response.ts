import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

export function generateReferenceId(): string {
  const year = new Date().getFullYear();
  return `SPA-${year}-${nanoid()}`;
}
