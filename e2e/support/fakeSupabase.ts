// A stand-in for Supabase, so the end-to-end tests run without Docker and can stage
// situations a real stack cannot, such as a dropped live connection.
//
// It answers what the site sends (E1 to E15 in docs/SDD.md): database reads and writes
// with the same access rules as the RLS policies, staff login with optional two-factor
// codes, photo storage, and Realtime's websocket protocol (JSON arrays
// [join_ref, ref, topic, event, payload]). Install it on a browser context to share one
// fake between pages, so a staff change in one tab reaches a visitor's tab.
// e2e/live-stack.spec.ts checks the same flows against the real stack in CI.
import type { BrowserContext, Page, Request, Route, WebSocketRoute } from '@playwright/test';
import type { Database } from '../../src/lib/database.types';
import { fixtureCategories, fixtureItems } from '../../src/test/menuFixture';
import { createContactHandler } from '../../supabase/functions/contact/handler.ts';

type Tables = Database['public']['Tables'];
type ItemRow = Tables['items']['Row'];
type CategoryRow = Tables['categories']['Row'];
type Row = Record<string, unknown>;
type Message = [string | null, string | null, string, string, Record<string, unknown>];

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

/** Columns the anonymous role may read on items (BACKEND-SCHEMA 3). */
const anonItemColumns = new Set([
  'id',
  'category_id',
  'name_en',
  'name_fil',
  'name_ko',
  'description_en',
  'description_fil',
  'description_ko',
  'price_centavos',
  'photo_path',
  'photo_format',
  'is_available',
  'is_sample',
  'sort_order',
  'availability_changed_at',
]);

export interface FakeUser {
  id: string;
  email: string;
  password: string;
  /** Listed in the admins table. */
  staff: boolean;
  requireMfa: boolean;
  factors: { id: string; status: 'verified' | 'unverified' }[];
}

interface FakeSession {
  userId: string;
  aal: 'aal1' | 'aal2';
}

export const staffLogin = { email: 'staff@example.test', password: 'Correct-horse-1' };
export const visitorLogin = { email: 'visitor@example.test', password: 'Not-staff-123' };
/** The code the fake authenticator app shows. */
export const validMfaCode = '123456';

const now = () => new Date().toISOString();
let counter = 0;
function newId(prefix: string): string {
  counter += 1;
  return `${prefix}0000000-0000-4000-8000-${String(Date.now() % 1e6).padStart(6, '0')}${String(counter).padStart(6, '0')}`;
}

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export class FakeSupabase {
  version = 1;
  categories: CategoryRow[] = fixtureCategories.map((c) => ({
    ...c,
    created_at: '2026-10-18T00:00:00.000Z',
    updated_at: '2026-10-18T00:00:00.000Z',
    updated_by: null,
  }));
  items: ItemRow[] = [
    ...fixtureItems.map((i) => ({
      ...i,
      is_published: true,
      created_at: '2026-10-18T00:00:00.000Z',
      updated_at: '2026-10-18T00:00:00.000Z',
      updated_by: null,
    })),
    // The seed's hidden item: staff see it, visitors never do (FR-07).
    {
      id: 'a0000000-0000-4000-8000-0000000000ff',
      category_id: 'c0000000-0000-4000-8000-000000000003',
      name_en: 'Cushion Foundation',
      name_fil: null,
      name_ko: '쿠션 파운데이션',
      description_en: 'Cushion compact with a refill.',
      description_fil: null,
      description_ko: '리필 포함 쿠션 팩트.',
      price_centavos: 145000,
      photo_path: null,
      photo_format: null,
      is_available: true,
      is_published: false,
      is_sample: true,
      sort_order: 3,
      availability_changed_at: '2026-10-18T04:00:00.000Z',
      created_at: '2026-10-18T00:00:00.000Z',
      updated_at: '2026-10-18T00:00:00.000Z',
      updated_by: null,
    },
  ];
  users: FakeUser[] = [
    {
      id: 'u0000000-0000-4000-8000-000000000001',
      ...staffLogin,
      staff: true,
      requireMfa: false,
      factors: [],
    },
    {
      id: 'u0000000-0000-4000-8000-000000000002',
      ...visitorLogin,
      staff: false,
      requireMfa: false,
      factors: [],
    },
  ];
  /** Stored photo files by path inside the bucket. */
  readonly files = new Map<string, { bytes: Buffer; contentType: string }>();
  /** `error` answers database reads with 500; `hold` leaves them waiting until `release()`. */
  rest: 'ok' | 'error' | 'hold' = 'ok';
  /** `down` closes every live connection as soon as it opens. */
  realtime: 'live' | 'down' = 'live';
  /** Answers password logins with 429, like Supabase Auth's per-IP limit. */
  loginRateLimited = false;
  readonly requests: string[] = [];
  readonly logouts: string[] = [];
  /** Messages stored by the contact function, newest last. */
  readonly messages: Record<string, unknown>[] = [];
  /** The real contact function logic, with this fake as its database (SDD 3.2). */
  private contactHits = new Map<string, number>();
  private contact = createContactHandler({
    allowedOrigins: ['http://127.0.0.1:4173'],
    ipSalt: 'e2e-salt',
    rateLimit: (key, max) => {
      const hits = (this.contactHits.get(key) ?? 0) + 1;
      this.contactHits.set(key, hits);
      return Promise.resolve(hits > max ? 600 : 0);
    },
    insert: (message) => {
      this.messages.push({
        id: newId('m'),
        ...message,
        utm: message.utm ?? null,
        created_at: now(),
      });
      return Promise.resolve();
    },
    log: () => undefined,
  });
  private sessions = new Map<string, FakeSession>();
  private refreshTokens = new Map<string, FakeSession>();
  private sockets = new Set<{ ws: WebSocketRoute; topic?: string }>();
  private held: (() => void)[] = [];
  private joins = 0;
  private joinWaiters: { count: number; resolve: () => void }[] = [];

  static async install(target: Page | BrowserContext): Promise<FakeSupabase> {
    const fake = new FakeSupabase();
    await target.route(/:54321\/(rest|auth|storage|functions)\/v1\//, (route) =>
      fake.answer(route),
    );
    await target.routeWebSocket(/:54321\/realtime\/v1\/websocket/, (ws) => {
      fake.connect(ws);
    });
    return fake;
  }

  item(nameEn: string): ItemRow {
    const item = this.items.find((i) => i.name_en === nameEn);
    if (!item) throw new Error(`No item named ${nameEn}`);
    return item;
  }

  user(email: string): FakeUser {
    const user = this.users.find((u) => u.email === email);
    if (!user) throw new Error(`No user ${email}`);
    return user;
  }

  /** A staff change made elsewhere: updates the item and bumps the menu version, as the triggers do. */
  changeItem(nameEn: string, patch: Partial<ItemRow>, { notify = true } = {}) {
    const item = this.item(nameEn);
    if ('is_available' in patch && patch.is_available !== item.is_available) {
      item.availability_changed_at = now();
    }
    Object.assign(item, patch);
    this.bumpVersion(notify);
  }

  /** Staff hide an item: visitors stop receiving it (FR-07). */
  hideItem(nameEn: string) {
    this.changeItem(nameEn, { is_published: false });
  }

  dropRealtime() {
    this.realtime = 'down';
    for (const socket of this.sockets) void socket.ws.close();
    this.sockets.clear();
  }

  restoreRealtime() {
    this.realtime = 'live';
  }

  /** Resolves once pages have joined a live channel `count` times in all. */
  subscribed(count = 1): Promise<void> {
    if (this.joins >= count) return Promise.resolve();
    return new Promise((resolve) => this.joinWaiters.push({ count, resolve }));
  }

  release() {
    this.rest = 'ok';
    for (const resolve of this.held.splice(0)) resolve();
  }

  private bumpVersion(notify = true) {
    this.version += 1;
    if (!notify) return;
    for (const socket of this.sockets) {
      if (!socket.topic) continue;
      socket.ws.send(
        JSON.stringify([
          null,
          null,
          socket.topic,
          'postgres_changes',
          {
            ids: [1000],
            data: {
              schema: 'public',
              table: 'menu_state',
              commit_timestamp: now(),
              type: 'UPDATE',
              columns: [
                { name: 'id', type: 'int2' },
                { name: 'version', type: 'int8' },
                { name: 'updated_at', type: 'timestamptz' },
              ],
              record: { id: 1, version: this.version, updated_at: now() },
              old_record: { id: 1 },
              errors: null,
            },
          },
        ] satisfies Message),
      );
    }
  }

  private async answer(route: Route) {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const url = new URL(request.url());
    this.requests.push(url.pathname);
    const [, area] = /\/(rest|auth|storage|functions)\/v1\//.exec(url.pathname) ?? [];
    const reply = (status: number, json?: unknown) =>
      route.fulfill(
        json === undefined
          ? { status, headers: corsHeaders }
          : { status, headers: corsHeaders, json },
      );

    if (area === 'functions') return this.answerFunction(request, url, route);
    if (area === 'auth') return this.answerAuth(request, url, reply);
    if (area === 'storage') return this.answerStorage(request, url, route, reply);

    if (this.rest === 'hold') await new Promise<void>((resolve) => this.held.push(resolve));
    if (this.rest === 'error') {
      return reply(500, {
        code: 'PGRST000',
        message: 'internal test failure, must never reach the page',
      });
    }
    return this.answerRest(request, url, reply);
  }

  // ---------- Auth ----------

  private bearer(request: Request): FakeSession | null {
    const header = request.headers().authorization ?? '';
    return this.sessions.get(header.replace(/^Bearer /, '')) ?? null;
  }

  private userJson(user: FakeUser) {
    return {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: '2026-10-18T00:00:00Z',
      last_sign_in_at: now(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: '2026-10-18T00:00:00Z',
      updated_at: now(),
      factors: user.factors.map((f) => ({
        id: f.id,
        friendly_name: 'Authenticator app',
        factor_type: 'totp',
        status: f.status,
        created_at: '2026-10-18T00:00:00Z',
        updated_at: now(),
      })),
    };
  }

  private newSession(user: FakeUser, aal: 'aal1' | 'aal2') {
    const issued = Math.floor(Date.now() / 1000);
    const token = [
      base64url({ alg: 'HS256', typ: 'JWT' }),
      base64url({
        sub: user.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: user.email,
        aal,
        amr: [{ method: aal === 'aal2' ? 'totp' : 'password', timestamp: issued }],
        session_id: newId('s'),
        iat: issued,
        exp: issued + 3600,
      }),
      'fake-signature',
    ].join('.');
    this.sessions.set(token, { userId: user.id, aal });
    const refreshToken = newId('r');
    this.refreshTokens.set(refreshToken, { userId: user.id, aal });
    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: issued + 3600,
      refresh_token: refreshToken,
      user: this.userJson(user),
    };
  }

  private async answerAuth(
    request: Request,
    url: URL,
    reply: (status: number, json?: unknown) => Promise<void>,
  ) {
    const path = url.pathname.replace(/^.*\/auth\/v1/, '');
    const body = (request.postDataJSON() ?? {}) as Record<string, string>;
    const session = this.bearer(request);
    const user = session ? this.users.find((u) => u.id === session.userId) : undefined;

    if (path === '/token' && url.searchParams.get('grant_type') === 'password') {
      if (this.loginRateLimited) {
        return reply(429, {
          code: 429,
          error_code: 'over_request_rate_limit',
          msg: 'Request rate limit reached',
        });
      }
      const match = this.users.find((u) => u.email === body.email && u.password === body.password);
      if (!match)
        return reply(400, {
          code: 400,
          error_code: 'invalid_credentials',
          msg: 'Invalid login credentials',
        });
      return reply(200, this.newSession(match, 'aal1'));
    }
    if (path === '/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const previous = this.refreshTokens.get(body.refresh_token ?? '');
      const owner = previous && this.users.find((u) => u.id === previous.userId);
      if (!previous || !owner)
        return reply(400, {
          code: 400,
          error_code: 'refresh_token_not_found',
          msg: 'Invalid Refresh Token',
        });
      return reply(200, this.newSession(owner, previous.aal));
    }
    if (path === '/logout') {
      if (user) this.logouts.push(user.email);
      return reply(204);
    }
    if (!user || !session)
      return reply(401, { code: 401, error_code: 'bad_jwt', msg: 'invalid JWT' });

    if (path === '/user') return reply(200, this.userJson(user));
    if (path === '/factors' && request.method() === 'POST') {
      const factor = { id: newId('f'), status: 'unverified' as const };
      user.factors.push(factor);
      return reply(200, {
        id: factor.id,
        type: 'totp',
        friendly_name: body.friendly_name ?? 'Authenticator app',
        totp: {
          qr_code:
            "data:image/svg+xml;utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='%23ddd'/></svg>",
          secret: 'JBSWY3DPEHPK3PXP',
          uri: 'otpauth://totp/Seoul-Mate:staff?secret=JBSWY3DPEHPK3PXP',
        },
      });
    }
    const factorMatch = /^\/factors\/([^/]+)(\/challenge|\/verify)?$/.exec(path);
    if (factorMatch) {
      const [, factorId, action] = factorMatch;
      const factor = user.factors.find((f) => f.id === factorId);
      if (!factor)
        return reply(404, { code: 404, error_code: 'mfa_factor_not_found', msg: 'not found' });
      if (request.method() === 'DELETE') {
        user.factors = user.factors.filter((f) => f !== factor);
        return reply(200, { id: factor.id });
      }
      if (action === '/challenge') {
        return reply(200, {
          id: newId('c'),
          type: 'totp',
          expires_at: Math.floor(Date.now() / 1000) + 300,
        });
      }
      if (action === '/verify') {
        if (body.code !== validMfaCode) {
          return reply(422, {
            code: 422,
            error_code: 'mfa_verification_failed',
            msg: 'Invalid TOTP code entered',
          });
        }
        factor.status = 'verified';
        return reply(200, this.newSession(user, 'aal2'));
      }
    }
    return reply(404, { code: 404, msg: `fake auth has no ${path}` });
  }

  // ---------- Database API ----------

  /** Whether the request may write, as `is_admin()` decides (BACKEND-SCHEMA 4.1). */
  private isAdmin(session: FakeSession | null): boolean {
    const user = session ? this.users.find((u) => u.id === session.userId) : undefined;
    return Boolean(user?.staff && session && (!user.requireMfa || session.aal === 'aal2'));
  }

  private filtered<T extends Row>(rows: T[], url: URL): T[] {
    let result = rows;
    for (const [key, value] of url.searchParams) {
      if (['select', 'order', 'limit', 'offset', 'columns'].includes(key)) continue;
      const match = /^eq\.(.*)$/.exec(value);
      if (match) result = result.filter((row) => String(row[key]) === match[1]);
    }
    return result;
  }

  private picked(rows: Row[], url: URL, allowed?: Set<string>): Row[] | null {
    const select = url.searchParams.get('select') ?? '*';
    const columns = select === '*' ? null : select.split(',').map((c) => c.trim());
    if (allowed && (columns ?? Object.keys(rows[0] ?? {})).some((c) => !allowed.has(c)))
      return null;
    return columns ? rows.map((row) => Object.fromEntries(columns.map((c) => [c, row[c]]))) : rows;
  }

  private async answerRest(
    request: Request,
    url: URL,
    reply: (status: number, json?: unknown) => Promise<void>,
  ) {
    const session = this.bearer(request);
    const admin = this.isAdmin(session);
    const table = url.pathname.replace(/^.*\/rest\/v1\//, '');
    const method = request.method();
    const single = (request.headers().accept ?? '').includes('vnd.pgrst.object');
    const respond = (rows: Row[]) =>
      reply(single ? (rows.length === 1 ? 200 : 406) : 200, single ? rows[0] : rows);

    if (table.startsWith('rpc/')) {
      const args = (request.postDataJSON() ?? {}) as { p_ids?: string[]; p_category_id?: string };
      if (table === 'rpc/is_admin') return reply(200, admin);
      if (!admin) return reply(403, { code: '42501', message: 'not allowed' });
      const list: Row[] = table === 'rpc/reorder_categories' ? this.categories : this.items;
      args.p_ids?.forEach((id, index) => {
        const row = list.find((r) => r.id === id);
        if (row) row.sort_order = index + 1;
      });
      this.bumpVersion();
      return reply(204);
    }

    if (table === 'menu_state') return respond([{ version: this.version }]);

    if (table === 'contact_messages') {
      if (!admin) return reply(session ? 200 : 401, session ? [] : { code: '42501' });
      return respond([...this.messages].reverse());
    }

    if (table === 'admins') {
      const user = session ? this.users.find((u) => u.id === session.userId) : undefined;
      const own = user?.staff ? [{ user_id: user.id, require_mfa: user.requireMfa }] : [];
      return respond(this.picked(this.filtered(own, url), url) ?? []);
    }

    if (table !== 'items' && table !== 'categories') return reply(404, { code: 'PGRST205' });
    const rows = (table === 'items' ? this.items : this.categories) as unknown as Row[];

    if (method === 'GET') {
      const visible =
        table === 'items' && !admin ? rows.filter((r) => r.is_published === true) : rows;
      const allowed = table === 'items' && !session ? anonItemColumns : undefined;
      const picked = this.picked(this.filtered(visible, url), url, allowed);
      if (!picked)
        return reply(401, { code: '42501', message: 'permission denied for table items' });
      return respond(picked.sort((a, b) => Number(a.sort_order) - Number(b.sort_order)));
    }

    // Writes: visitors and non-staff accounts change nothing (NFR-SEC-02, NFR-SEC-03).
    if (method === 'POST') {
      if (!admin)
        return reply(403, { code: '42501', message: 'new row violates row-level security policy' });
      const fields = request.postDataJSON() as Row;
      if (table === 'categories' && this.categories.some((c) => c.slug === fields.slug)) {
        return reply(409, { code: '23505', message: 'duplicate key value' });
      }
      const row: Row =
        table === 'items'
          ? {
              description_en: '',
              name_fil: null,
              name_ko: null,
              description_fil: null,
              description_ko: null,
              photo_path: null,
              photo_format: null,
              is_published: false,
              is_available: true,
              is_sample: false,
              sort_order: 0,
              availability_changed_at: now(),
              created_at: now(),
              updated_at: now(),
              updated_by: session?.userId ?? null,
              ...fields,
              id: newId('a'),
            }
          : {
              name_fil: null,
              name_ko: null,
              sort_order: 0,
              created_at: now(),
              updated_at: now(),
              updated_by: null,
              ...fields,
              id: newId('c'),
            };
      rows.push(row);
      this.bumpVersion();
      return respond([row]);
    }

    const targets = admin ? this.filtered(rows, url) : [];
    if (method === 'PATCH') {
      const fields = request.postDataJSON() as Row;
      for (const row of targets) {
        if ('is_available' in fields && fields.is_available !== row.is_available) {
          row.availability_changed_at = now();
        }
        Object.assign(row, fields, { updated_at: now() });
      }
      this.bumpVersion();
      return respond(this.picked(targets, url) ?? targets);
    }
    if (method === 'DELETE') {
      if (
        table === 'categories' &&
        targets.some((c) => this.items.some((i) => i.category_id === c.id))
      ) {
        return reply(409, { code: '23503', message: 'still referenced from table "items"' });
      }
      if (table === 'items')
        this.items = this.items.filter((i) => !targets.includes(i as unknown as Row));
      else this.categories = this.categories.filter((c) => !targets.includes(c as unknown as Row));
      this.bumpVersion();
      return respond(this.picked(targets, url) ?? targets);
    }
    return reply(405);
  }

  // ---------- Edge Functions ----------

  private async answerFunction(request: Request, url: URL, route: Route) {
    if (!url.pathname.endsWith('/functions/v1/contact')) {
      await route.fulfill({ status: 404, headers: corsHeaders, body: '' });
      return;
    }
    const body = request.method() === 'POST' ? (request.postData() ?? '') : null;
    const response = await this.contact(
      new globalThis.Request(url, {
        method: request.method(),
        headers: request.headers(),
        ...(body === null ? {} : { body }),
      }),
    );
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    });
  }

  // ---------- Storage ----------

  private async answerStorage(
    request: Request,
    url: URL,
    route: Route,
    reply: (status: number, json?: unknown) => Promise<void>,
  ) {
    const publicMatch = /\/storage\/v1\/object\/public\/item-photos\/(.+)$/.exec(url.pathname);
    if (publicMatch?.[1]) {
      const file = this.files.get(decodeURIComponent(publicMatch[1]));
      if (!file) return reply(404, { error: 'not_found' });
      return route.fulfill({
        status: 200,
        headers: { ...corsHeaders, 'content-type': file.contentType },
        body: file.bytes,
      });
    }
    if (!this.isAdmin(this.bearer(request)))
      return reply(403, { statusCode: '403', error: 'Unauthorized' });

    const objectMatch = /\/storage\/v1\/object\/item-photos\/(.+)$/.exec(url.pathname);
    if (request.method() === 'POST' && objectMatch?.[1]) {
      const path = decodeURIComponent(objectMatch[1]);
      if (!/^items\/[0-9a-f-]{36}\/[0-9]+\/(320|640|1024)\.(webp|jpg)$/.test(path)) {
        return reply(403, {
          statusCode: '403',
          error: 'new row violates row-level security policy',
        });
      }
      this.files.set(path, extractFile(request));
      return reply(200, { Key: `item-photos/${path}`, Id: newId('o') });
    }
    if (request.method() === 'DELETE' && url.pathname.endsWith('/storage/v1/object/item-photos')) {
      const { prefixes = [] } = request.postDataJSON() as { prefixes?: string[] };
      for (const path of prefixes) this.files.delete(path);
      return reply(
        200,
        prefixes.map((name) => ({ name })),
      );
    }
    return reply(404, { error: 'not_found' });
  }

  // ---------- Realtime ----------

  private connect(ws: WebSocketRoute) {
    if (this.realtime === 'down') {
      void ws.close();
      return;
    }
    const socket: { ws: WebSocketRoute; topic?: string } = { ws };
    this.sockets.add(socket);
    ws.onClose(() => this.sockets.delete(socket));
    ws.onMessage((raw) => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(raw)) as Message;
      const reply = (response: Record<string, unknown>) => {
        ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response }]));
      };
      if (event === 'phx_join') {
        socket.topic = topic;
        const config = payload.config as { postgres_changes?: Record<string, unknown>[] };
        reply({
          postgres_changes: (config.postgres_changes ?? []).map((filter, i) => ({
            ...filter,
            id: 1000 + i,
          })),
        });
        this.joins += 1;
        this.joinWaiters = this.joinWaiters.filter((waiter) => {
          if (waiter.count > this.joins) return true;
          waiter.resolve();
          return false;
        });
      } else if (event === 'heartbeat' || event === 'phx_leave') {
        reply({});
      }
    });
  }
}

/** The uploaded file: the raw body, or the file part of a multipart form, as supabase-js sends Blobs. */
function extractFile(request: Request): { bytes: Buffer; contentType: string } {
  const body = request.postDataBuffer() ?? Buffer.alloc(0);
  const type = request.headers()['content-type'] ?? '';
  const boundary = /boundary=([^;]+)/.exec(type)?.[1];
  if (!boundary) return { bytes: body, contentType: type };
  for (const part of body.toString('latin1').split(`--${boundary}`)) {
    const split = part.indexOf('\r\n\r\n');
    if (split < 0) continue;
    const headers = part.slice(0, split);
    const partType = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1];
    if (!partType?.startsWith('image/')) continue;
    const content = part.slice(split + 4).replace(/\r\n$/, '');
    return { bytes: Buffer.from(content, 'latin1'), contentType: partType };
  }
  return { bytes: body, contentType: type };
}
