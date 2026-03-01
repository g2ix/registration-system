/**
 * Performance test for key API endpoints.
 * Run with: node scripts/performance-test.js
 * Ensure the dev server is running (npm run dev) first.
 *
 * For authenticated endpoints, set AUTH_COOKIE env var or run against a logged-in session.
 */

const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function measure(name, fn, iterations = 5) {
  const times = []
  let lastError = null
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    try {
      await fn()
    } catch (e) {
      lastError = e
      break
    }
    times.push(performance.now() - start)
  }
  if (times.length === 0) {
    console.error(`  ✗ ${name} failed:`, lastError?.message || 'unknown')
    return null
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  return { avg, min, max, times }
}

async function fetchWithStatus(url) {
  const r = await fetch(url, { redirect: 'manual' })
  const text = await r.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: r.status, body }
}

async function main() {
  console.log('\n📊 Performance Test — USCC-MPC Attendance API\n')
  console.log(`Base URL: ${BASE}\n`)

  // Quick connectivity check
  try {
    const probe = await fetchWithStatus(`${BASE}/api/attendance/recent`)
    if (probe.status === 401) {
      console.log('⚠ Auth required. Log in at', BASE + '/login', 'then run this test.\n')
    } else if (probe.status >= 400) {
      console.log(`⚠ API returned ${probe.status}. Ensure dev server is running (npm run dev).\n`)
    }
  } catch (e) {
    console.log('✗ Cannot reach server. Start with: npm run dev\n')
    process.exit(1)
  }

  const results = []

  // 1. Recent attendance (most frequently polled)
  const recent = await measure('GET /api/attendance/recent', async () => {
    const r = await fetch(`${BASE}/api/attendance/recent`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    await r.json()
  }, 10)
  if (recent) {
    results.push({ name: 'Recent feed', ...recent })
  }

  // 2. Member search (text)
  const searchText = await measure('GET /api/members/search?q=smith', async () => {
    const r = await fetch(`${BASE}/api/members/search?q=smith`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    await r.json()
  }, 10)
  if (searchText) {
    results.push({ name: 'Member search (text)', ...searchText })
  }

  // 3. Member search (numeric)
  const searchNum = await measure('GET /api/members/search?q=1', async () => {
    const r = await fetch(`${BASE}/api/members/search?q=1`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    await r.json()
  }, 10)
  if (searchNum) {
    results.push({ name: 'Member search (numeric)', ...searchNum })
  }

  // Print results
  console.log('Results (ms):\n')
  results.forEach(({ name, avg, min, max }) => {
    const bar = '█'.repeat(Math.min(50, Math.round(avg / 5))) + '░'.repeat(Math.max(0, 50 - Math.round(avg / 5)))
    console.log(`  ${name}`)
    console.log(`    avg: ${avg.toFixed(1)}ms  min: ${min.toFixed(1)}ms  max: ${max.toFixed(1)}ms`)
    console.log(`    ${bar}\n`)
  })

  if (results.length > 0) {
    const totalAvg = results.reduce((s, r) => s + r.avg, 0) / results.length
    console.log(`Overall average: ${totalAvg.toFixed(1)}ms`)
  }
  console.log('\n')
}

main().catch(console.error)
