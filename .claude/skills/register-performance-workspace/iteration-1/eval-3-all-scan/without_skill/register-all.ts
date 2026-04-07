/**
 * Register performances from all 4 platforms (3 IDs each) via API.
 *
 * Usage: npx tsx register-all.ts
 */

// IDs picked from autoparse history.json - known valid, recent IDs
const PLATFORM_IDS: Record<string, { ids: string[]; urlTemplate: (id: string) => string }> = {
  melon: {
    ids: ['212991', '212767', '212755'],
    urlTemplate: (id) => `https://ticket.melon.com/performance/index.htm?prodId=${id}`,
  },
  nol: {
    ids: ['26002950', '26002962', '26003309'],
    urlTemplate: (id) => `https://tickets.interpark.com/goods/${id}`,
  },
  ticketlink: {
    ids: ['61992', '62284', '62099'],
    urlTemplate: (id) => `https://www.ticketlink.co.kr/product/${id}`,
  },
  yes24: {
    ids: ['51902', '51866', '51858'],
    urlTemplate: (id) => `https://ticket.yes24.com/Perf/${id}`,
  },
};

const API_BASE = process.env.API_BASE || 'https://api.ipchun.live';

interface FetchResult {
  platform: string;
  externalId: string;
  title?: string;
  status: 'fetched' | 'registered' | 'duplicate' | 'fetch_error' | 'register_error';
  error?: string;
  performanceId?: string;
}

async function fetchPerformance(url: string): Promise<any> {
  const res = await fetch(`${API_BASE}/performances/fetch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, skipDuplicateCheck: true }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}

function toCreateDto(data: any): any {
  return {
    title: data.title,
    subtitle: data.subtitle || undefined,
    genre: data.genre || 'CONCERT',
    ageRating: data.ageRating || undefined,
    runtime: data.runtime || undefined,
    intermission: data.intermission || undefined,
    posterUrl: data.posterUrl || undefined,
    status: data.source?.salesStatus || 'SCHEDULED',
    organizer: data.organizer || undefined,
    venueName: data.venue?.name || undefined,
    venueAddress: data.venue?.address || undefined,
    venueLatitude: data.venue?.latitude || undefined,
    venueLongitude: data.venue?.longitude || undefined,
    platform: data.source?.platform || undefined,
    externalId: data.source?.externalId || undefined,
    sourceUrl: data.source?.sourceUrl || undefined,
    ticketOpenAt: data.source?.ticketOpenAt || undefined,
    bookingEndAt: data.source?.bookingEndAt || undefined,
    salesStatus: data.source?.salesStatus || undefined,
    schedules: data.schedules || [],
    tickets: data.tickets || [],
  };
}

async function registerPerformance(dto: any): Promise<any> {
  const res = await fetch(`${API_BASE}/performances`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 409 || text.includes('이미 등록된')) {
      throw new Error(`DUPLICATE: ${text}`);
    }
    throw new Error(`Register failed (${res.status}): ${text}`);
  }
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`API Base: ${API_BASE}`);
  console.log('='.repeat(60));

  const results: FetchResult[] = [];

  for (const [platform, config] of Object.entries(PLATFORM_IDS)) {
    console.log(`\n### ${platform.toUpperCase()} ###`);

    for (const id of config.ids) {
      const url = config.urlTemplate(id);
      const result: FetchResult = { platform, externalId: id, status: 'fetch_error' };

      try {
        // Step 1: Fetch
        console.log(`  [${platform}/${id}] Fetching...`);
        const fetched = await fetchPerformance(url);
        result.title = fetched.title;
        result.status = 'fetched';
        console.log(`  [${platform}/${id}] Fetched: "${fetched.title}"`);

        // Step 2: Register
        console.log(`  [${platform}/${id}] Registering...`);
        const dto = toCreateDto(fetched);
        const created = await registerPerformance(dto);
        result.status = 'registered';
        result.performanceId = created.id;
        console.log(`  [${platform}/${id}] Registered! ID: ${created.id}`);
      } catch (err: any) {
        const msg = err.message || String(err);
        if (msg.includes('DUPLICATE') || msg.includes('409') || msg.includes('이미 등록된')) {
          result.status = 'duplicate';
          result.error = 'Already registered';
          console.log(`  [${platform}/${id}] Duplicate (already in DB)`);
        } else if (result.status === 'fetched') {
          result.status = 'register_error';
          result.error = msg;
          console.log(`  [${platform}/${id}] Register error: ${msg.slice(0, 100)}`);
        } else {
          result.status = 'fetch_error';
          result.error = msg;
          console.log(`  [${platform}/${id}] Fetch error: ${msg.slice(0, 100)}`);
        }
      }

      results.push(result);
      await sleep(1500); // Rate limiting
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const registered = results.filter(r => r.status === 'registered');
  const duplicates = results.filter(r => r.status === 'duplicate');
  const fetchErrors = results.filter(r => r.status === 'fetch_error');
  const registerErrors = results.filter(r => r.status === 'register_error');

  console.log(`Total: ${results.length}`);
  console.log(`Registered: ${registered.length}`);
  console.log(`Duplicates: ${duplicates.length}`);
  console.log(`Fetch errors: ${fetchErrors.length}`);
  console.log(`Register errors: ${registerErrors.length}`);

  console.log('\nDetails:');
  for (const r of results) {
    const icon = r.status === 'registered' ? 'OK' : r.status === 'duplicate' ? 'DUP' : 'ERR';
    console.log(`  [${icon}] ${r.platform}/${r.externalId}: ${r.title || '(no title)'} ${r.performanceId ? `-> ${r.performanceId}` : ''} ${r.error ? `(${r.error.slice(0, 80)})` : ''}`);
  }

  // Output JSON for summary
  const output = JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2);
  console.log('\n---JSON_OUTPUT_START---');
  console.log(output);
  console.log('---JSON_OUTPUT_END---');
}

main().catch(console.error);
