// src/core/api/endpoints.ts
// baseURL = 'http://localhost:8080' (no /api suffix) — all paths include /api prefix

const endpoints = {

  // ── Authentication ─────────────────────────────────────────────────
  auth: {
    vendor: {
      register: '/api/auth/vendor/register',
      login:    '/api/auth/vendor/login',
      verify:   '/api/auth/vendor/verify',
    },
    refresh: '/api/auth/refresh',
    logout:  '/api/auth/logout',
  },

  // ── Vendor Profile ─────────────────────────────────────────────────
  // VendorProfileController → /api/vendor/profile
  vendor: {
    profile:       '/api/vendor/profile',
    profileStatus: '/api/vendor/profile/status',
  },

  // ── Store Management ───────────────────────────────────────────────
  // StoreController → /api/vendor/stores (auth required, VENDOR role)
  store: {
    my:         '/api/vendor/stores/my',
    myLocation: '/api/vendor/stores/my/location',
    myStatus:   '/api/vendor/stores/my/status',
    myBanner:   '/api/vendor/stores/my/banner',
    timings:    (storeId: number) => `/api/vendor/stores/${storeId}/timings`,
    timing:     (storeId: number, timingId: number) => `/api/vendor/stores/${storeId}/timings/${timingId}`,
    holidays:   (storeId: number) => `/api/vendor/stores/${storeId}/holidays`,
    holiday:    (storeId: number, holidayId: number) => `/api/vendor/stores/${storeId}/holidays/${holidayId}`,
  },

  // ── Menu Management ────────────────────────────────────────────────
  // CategoryController → /api/menu/categories
  // MenuItemController → /api/menu/items
  menu: {
    categories:        '/api/menu/categories',
    category:          (categoryId: number) => `/api/menu/categories/${categoryId}`,
    items:             '/api/menu/items',
    item:              (itemId: number) => `/api/menu/items/${itemId}`,
    itemsByCategory:   (categoryId: number) => `/api/menu/items/by-category/${categoryId}`,
  },

  // ── Card Management ────────────────────────────────────────────────
  // VendorCardController → /api/cards (auth required, VENDOR role)
  card: {
    my:                 '/api/cards/my',
    create:             '/api/cards',
    detail:             (id: number) => `/api/cards/${id}`,
    preview:            (id: number) => `/api/cards/${id}/preview`,
    storeSubscriptions: (storeId: number) => `/api/cards/subscriptions/store/${storeId}`,
    subscription:       (subscriptionId: number) => `/api/cards/subscriptions/${subscriptionId}`,
  },

  // ── Redemption ─────────────────────────────────────────────────────
  // VendorRedemptionController → /api/redemptions
  redemption: {
    queue:   (storeId: number) => `/api/redemptions/store/${storeId}/queue`,
    history: (storeId: number) => `/api/redemptions/store/${storeId}`,
    detail:  (id: string | number) => `/api/redemptions/${id}`,
    approve: (id: string) => `/api/redemptions/${id}/approve`,
    reject:  (id: string) => `/api/redemptions/${id}/reject`,
  },

  // ── Ledger ─────────────────────────────────────────────────────────
  // VendorTransactionController → /api/ledger
  ledger: {
    store: (storeId: number) => `/api/ledger/store/${storeId}`,
  },

  // ── Dashboard ──────────────────────────────────────────────────────
  // DashboardController → /api/dashboard
  dashboard: {
    my:    '/api/dashboard/my',
    store: (storeId: number) => `/api/dashboard/store/${storeId}`,
  },

  // ── Analytics ──────────────────────────────────────────────────────
  // AnalyticsController → /api/analytics (NOT under /vendor/)
  analytics: {
    my:    '/api/analytics/my',
    store: (storeId: number) => `/api/analytics/store/${storeId}`,
  },

  // ── Coupons ────────────────────────────────────────────────────────
  // CouponController → /api/vendor/coupons (auth required, VENDOR role)
  coupon: {
    my: '/api/vendor/coupons/my',
  },

  // ── Withdrawals / Wallet ──────────────────────────────────────────────
  // VendorWithdrawalController → /api/vendor/withdrawals (auth required, VENDOR role)
  // Thin proxy to admin-service (RestTemplate passthrough) — responses are raw JSON,
  // NOT wrapped in the usual ApiResponse<T> envelope.
  withdrawal: {
    my:    '/api/vendor/withdrawals',
    stats: '/api/vendor/withdrawals/stats',
  },

} as const;

export default endpoints;
