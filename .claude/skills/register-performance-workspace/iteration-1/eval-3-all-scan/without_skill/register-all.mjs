// Register performances from all 4 platforms (3 IDs each) via local API
const API = 'http://localhost:3000';

const PLATFORMS = {
  melon: {
    ids: ['212991', '212767', '212755'],
    url: (id) => `https://ticket.melon.com/performance/index.htm?prodId=${id}`,
  },
  nol: {
    ids: ['26002950', '26002962', '26003309'],
    url: (id) => `https://tickets.interpark.com/goods/${id}`,
  },
  ticketlink: {
    ids: ['61992', '62284', '62099'],
    url: (id) => `https://www.ticketlink.co.kr/product/${id}`,
  },
  yes24: {
    ids: ['51902', '51866', '51858'],
    url: (id) => `https://ticket.yes24.com/Perf/${id}`,
  },
};

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [platform, cfg] of Object.entries(PLATFORMS)) {
  for (const id of cfg.ids) {
    const url = cfg.url(id);
    let r = { platform, id, status: 'error' };
    try {
      // Step 1: fetch
      const fRes = await fetch(`${API}/performances/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, skipDuplicateCheck: true }),
      });
      if (!fRes.ok) {
        const t = await fRes.text();
        r.error = `fetch ${fRes.status}: ${t.slice(0, 120)}`;
        results.push(r);
        await sleep(1500);
        continue;
      }
      const data = await fRes.json();
      r.title = data.title;

      // Step 2: register
      const dto = {
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

      const cRes = await fetch(`${API}/performances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto),
      });
      if (!cRes.ok) {
        const t = await cRes.text();
        if (cRes.status === 409 || t.includes('이미 등록된')) {
          r.status = 'duplicate';
        } else {
          r.status = 'register_error';
          r.error = `create ${cRes.status}: ${t.slice(0, 120)}`;
        }
      } else {
        const created = await cRes.json();
        r.status = 'registered';
        r.performanceId = created.id;
      }
    } catch (e) {
      r.error = e.message;
    }
    results.push(r);
    console.log(`[${r.status}] ${platform}/${id}: ${r.title || '?'} ${r.performanceId || ''} ${r.error || ''}`);
    await sleep(1500);
  }
}

console.log('\n=== SUMMARY ===');
const reg = results.filter((r) => r.status === 'registered');
const dup = results.filter((r) => r.status === 'duplicate');
const err = results.filter((r) => r.status !== 'registered' && r.status !== 'duplicate');
console.log(`Registered: ${reg.length}, Duplicates: ${dup.length}, Errors: ${err.length}`);
console.log(JSON.stringify(results, null, 2));
