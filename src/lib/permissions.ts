import type { Role } from "../types";

export function canEditTrip(role: Role) {
  return role === "owner";
}

export function canComment(role: Role) {
  return role === "owner" || role === "member";
}

export function canAddExpense(role: Role, canAddExpenses: boolean) {
  return role === "owner" || (role === "member" && canAddExpenses);
}

export function canViewPrivate(role: Role) {
  return role === "owner";
}
