import { calcStatusCounts } from './metrics.calc'

describe('calcStatusCounts', () => {
  it('counts statuses within window', () => {
    const window = { label: '7d', from: '2026-01-01', to: '2026-01-07' }
    const results = [
      { id:'1', organizationId:'o', status:'pass', occurredAt:'2026-01-02', violations:[] },
      { id:'2', organizationId:'o', status:'fail', occurredAt:'2026-01-08', violations:[] },
    ] as any
    const c = calcStatusCounts(results, window)
    expect(c.total).toBe(1)
    expect(c.pass).toBe(1)
  })
})
