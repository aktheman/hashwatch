let _email: string | null = null;

export function setAuthEmail(email: string | null): void {
  _email = email;
}

export function getAuthEmail(): string | null {
  return _email;
}
