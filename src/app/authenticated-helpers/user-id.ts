export function sameUserId(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  return left === right || left.replace(/^(usr_)+/, "") === right.replace(/^(usr_)+/, "");
}
