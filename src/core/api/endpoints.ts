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
    // StoreCategoryController → /api/vendor/store-categories (GET only — this is the
    // admin-curated list Store.category (a plain string) gets picked from; management
    // (create/edit/delete) happens only in the admin panel).
    categories: '/api/vendor/store-categories',
  },

  // ── Menu Management ────────────────────────────────────────────────
  // CategoryController → /api/menu/categories
  // MenuItemController → /api/menu/items
  //
  // Category ownership: categories are global master data, owned and
  // mutated only through the separate admin panel (SUPER_ADMIN-only
  // endpoints on admin-service, not part of this app). vendor-service's
  // /api/menu/categories is GET-only — it has no POST/PUT/DELETE routes at
  // all — so there is no vendor-scoped category mutation route to
  // deliberately omit anymore; this app reads the single GET route below
  // (via categoryService.fetchActiveCategories) and nothing else exists to call.
  menu: {
    categories:        '/api/menu/categories',
    items:             '/api/menu/items',
    item:              (itemId: number) => `/api/menu/items/${itemId}`,
    itemsByCategory:   (categoryId: number) => `/api/menu/items/by-category/${categoryId}`,
    // Confirmed live on vendor-service. menuService.uploadMenuItemImage() still degrades
    // gracefully on failure (item still saves) since a photo upload is a secondary step.
    itemImage:         (itemId: number) => `/api/menu/items/${itemId}/image`,
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

  // ── Pay at Store (vendor confirmation) ────────────────────────────
  // VendorPayAtStoreController → /api/payments/pay-at-store (card-service, auth required, VENDOR role)
  // vendorId is derived from the JWT server-side — no storeId/vendorId param needed.
  payAtStore: {
    pending:    '/api/payments/pay-at-store/pending',
    history:    '/api/payments/pay-at-store/history',
    verifyQr:   '/api/payments/pay-at-store/verify-qr',
    verifyCode: '/api/payments/pay-at-store/verify-code',
    confirm:    (id: number | string) => `/api/payments/pay-at-store/${id}/confirm`,
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
    // POST /api/vendor/coupons — vendor submits a coupon request; returned with
    // approvalStatus: 'PENDING', isActive: false. Admin approves/rejects via
    // admin-service (PATCH /api/admin/coupons/{id}/approve|reject).
    create: '/api/vendor/coupons',
  },

  // ── Notifications ─────────────────────────────────────────────────
  // VendorNotificationController → /api/vendor/notifications (auth required, VENDOR role)
  // NOT YET IMPLEMENTED BACKEND-SIDE — this is the proposed contract; see notifications plan.
  notification: {
    list:                '/api/vendor/notifications',              // GET, paginated: ?page=&size=&unreadOnly=
    unreadCount:         '/api/vendor/notifications/unread-count',  // GET
    markRead:            (id: number | string) => `/api/vendor/notifications/${id}/read`, // PATCH
    markAllRead:         '/api/vendor/notifications/read-all',      // PATCH
    registerPushToken:   '/api/vendor/notifications/push-token',    // POST
    deregisterPushToken: '/api/vendor/notifications/push-token',    // DELETE
  },

  // ── Withdrawals / Wallet ──────────────────────────────────────────────
  // VendorWithdrawalController → /api/vendor/withdrawals (auth required, VENDOR role)
  // Thin proxy to admin-service (RestTemplate passthrough) — responses are raw JSON,
  // NOT wrapped in the usual ApiResponse<T> envelope.
  withdrawal: {
    my:          '/api/vendor/withdrawals',
    stats:       '/api/vendor/withdrawals/stats',
    commissions: '/api/vendor/withdrawals/commissions',
    payoutMethod: '/api/vendor/withdrawals/payout-method',
  },

} as const;

export default endpoints;
