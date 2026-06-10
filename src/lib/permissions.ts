import type { Role } from "../types";

export function canEditTrip(role: Role) {
  return role === "owner" || role === "organizer";
}

export function canComment(role: Role) {
  return role === "owner" || role === "organizer";
}

export function canAddExpense(role: Role, canAddExpenses: boolean) {
  return role === "owner" || (role === "organizer" && canAddExpenses);
}

export function canViewPrivate(role: Role) {
  return role === "owner";
}
