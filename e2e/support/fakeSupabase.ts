// A stand-in for the Supabase database API and Realtime, so the end-to-end tests run
// without Docker and can stage situations a real stack cannot, such as a dropped live
// connection. It answers the requests the public site makes (E1 to E4 in docs/SDD.md),
// speaking Realtime's websocket protocol: JSON arrays [join_ref, ref, topic, event, payload].
// e2e/live-stack.spec.ts covers the real stack in CI.
import type { Page, Route, WebSocketRoute } from '@playwright/test';
import type { Item } from '../../src/features/catalog/types';
import { fixtureCategories, fixtureItems } from '../../src/test/menuFixture';

type Message = [string | null, string | null, string, string, Record<string, unknown>];

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
};

export class FakeSupabase {
  version = 1;
  categories = structuredClone(fixtureCategories);
  items = structuredClone(fixtureItems);
  /** `error` answers menu reads with 500; `hold` leaves them waiting until `release()`. */
  rest: 'ok' | 'error' | 'hold' = 'ok';
  /** `down` closes every live connection as soon as it opens. */
  realtime: 'live' | 'down' = 'live';
  readonly requests: string[] = [];
  private sockets = new Set<{ ws: WebSocketRoute; topic?: string }>();
  private held: (() => void)[] = [];
  private joins = 0;
  private joinWaiters: { count: number; resolve: () => void }[] = [];

  static async install(page: Page): Promise<FakeSupabase> {
    const fake = new FakeSupabase();
    await page.route(/:54321\/rest\/v1\//, (route) => fake.answerRest(route));
    await page.routeWebSocket(/:54321\/realtime\/v1\/websocket/, (ws) => {
      fake.connect(ws);
    });
    return fake;
  }

  /** A staff change: updates the item and bumps the menu version, as the database triggers do. */
  changeItem(nameEn: string, patch: Partial<Item>, { notify = true } = {}) {
    const item = this.items.find((i) => i.name_en === nameEn);
    if (!item) throw new Error(`No item named ${nameEn}`);
    Object.assign(item, patch);
    if ('is_available' in patch) item.availability_changed_at = new Date().toISOString();
    this.bumpVersion(notify);
  }

  /** Staff hide an item: visitors stop receiving it (FR-07). */
  hideItem(nameEn: string) {
    this.items = this.items.filter((i) => i.name_en !== nameEn);
    this.bumpVersion(true);
  }

  dropRealtime() {
    this.realtime = 'down';
    for (const socket of this.sockets) void socket.ws.close();
    this.sockets.clear();
  }

  restoreRealtime() {
    this.realtime = 'live';
  }

  /** Resolves once the page has joined a live channel `count` times in all, so changes after it are pushed. */
  subscribed(count = 1): Promise<void> {
    if (this.joins >= count) return Promise.resolve();
    return new Promise((resolve) => this.joinWaiters.push({ count, resolve }));
  }

  release() {
    this.rest = 'ok';
    for (const resolve of this.held.splice(0)) resolve();
  }

  private bumpVersion(notify: boolean) {
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
              commit_timestamp: new Date().toISOString(),
              type: 'UPDATE',
              columns: [
                { name: 'id', type: 'int2' },
                { name: 'version', type: 'int8' },
                { name: 'updated_at', type: 'timestamptz' },
              ],
              record: { id: 1, version: this.version, updated_at: new Date().toISOString() },
              old_record: { id: 1 },
              errors: null,
            },
          },
        ] satisfies Message),
      );
    }
  }

  private async answerRest(route: Route) {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const url = new URL(request.url());
    this.requests.push(url.pathname);

    if (this.rest === 'hold') {
      await new Promise<void>((resolve) => this.held.push(resolve));
    }
    if (this.rest === 'error') {
      await route.fulfill({
        status: 500,
        headers: corsHeaders,
        json: { code: 'PGRST000', message: 'internal test failure, must never reach the page' },
      });
      return;
    }

    const table = url.pathname.split('/').pop();
    const single = (request.headers().accept ?? '').includes('vnd.pgrst.object');
    const state = { version: this.version };
    const body =
      table === 'menu_state'
        ? single
          ? state
          : [state]
        : table === 'categories'
          ? this.categories
          : table === 'items'
            ? this.items
            : null;
    if (body === null) {
      await route.fulfill({ status: 404, headers: corsHeaders, json: { code: 'PGRST205' } });
      return;
    }
    await route.fulfill({ status: 200, headers: corsHeaders, json: body });
  }

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
