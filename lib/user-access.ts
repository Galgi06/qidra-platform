type UserBlockState = {
  blockedAt?: Date | null;
  blockedUntil?: Date | null;
};

export function isUserBlocked(user?: UserBlockState | null, now = new Date()) {
  if (!user?.blockedAt) {
    return false;
  }

  return !user.blockedUntil || user.blockedUntil > now;
}

export function userBlockMode(user?: UserBlockState | null, now = new Date()) {
  if (!isUserBlocked(user, now)) {
    return "active" as const;
  }

  return user?.blockedUntil ? ("temporary" as const) : ("permanent" as const);
}
