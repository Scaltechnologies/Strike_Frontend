// src/core/api/endpoints.ts
// baseURL = 'http://localhost:8080' (no /api suffix) — all paths include /api prefix

const endpoints = {

  // ── Authentication ─────────────────────────────────────────────────
  auth: {
    vendor: {
      register:      '/api/auth/vendor/register',
      login:         '/api/auth/vendor/login',
      verify:        '/api/auth/vendor/verify',
      // Firebase Phone Auth ID token exchange — the primary UI login path.
      // register/login/verify above remain the legacy fallback path.
      firebaseVerify: '/api/auth/vendor/firebase-verify',
      // Multipart, unauthenticated (called before /register) — uploads a store
      // banner picked on the signup screen and returns a URL to include as
      // RegisterVendorRequest.logoUrl. See registerLogoUpload() in authService.ts.
      registerLogoUpload: '/api/auth/vendor/register/upload-logo',
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
  // NotificationSelfServiceController → /api/notifications/me (auth required — scoped to
  // the authenticated principal, VENDOR included; notification-service, not vendor-service).
  notification: {
    list:                '/api/notifications/me',                          // GET, paginated: ?page=&size=
    unreadCount:         '/api/notifications/me/unread-count',             // GET -> { unreadCount }
    markRead:            (id: number | string) => `/api/notifications/me/${id}/read`, // PATCH
    markAllRead:         '/api/notifications/me/read-all',                 // PATCH -> { updated }
    registerPushToken:   '/api/notifications/me/devices',                  // POST -> PushDevice { id, ... }
    deregisterPushToken: (deviceId: number | string) => `/api/notifications/me/devices/${deviceId}`, // DELETE
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
