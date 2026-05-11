// src/core/api/endpoints.ts

const endpoints = {
  auth: {
    sendOtp: '/auth/send-otp',
    verifyOtp: '/auth/verify-otp',
    signup: '/auth/signup',
    logout: '/auth/logout',
  },
  user: {
    profile: '/user/profile',
    updateProfile: '/user/profile/update',
  },
  vendor: {
    list: '/vendor/list',
    detail: (id: string) => `/vendor/${id}`,
  },
  card: {
    list: '/card/list',
    detail: (id: string) => `/card/${id}`,
  },
  ledger: {
    transactions: '/ledger/transactions',
  },
  redemption: {
    redeem: '/redemption/redeem',
    history: '/redemption/history',
  },
} as const;

export default endpoints;