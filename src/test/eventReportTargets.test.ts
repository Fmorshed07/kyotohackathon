import { describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  snapshot: {
    capturedAt: '2026-11-03T07:31:08.709Z',
    basis: 'Synthetic approved aggregate fixture; separate measures, not attendance.',
    events: [{
      eventId: 'impact-osaka-2026',
      portalParticipantAccounts: 16,
      projectRecords: 8,
      namedProjectRecords: 8,
      videoProjectRecords: 7,
      publicProjectRecords: 4,
      approvedImportedRegistrations: 80,
    }],
  },
}));

vi.mock('@/data/eventMetricsSnapshot.json', () => ({ default: fixtures.snapshot }));

import { getBundledHackathon } from '@/lib/bundledHackathons';
import { EVENT_REPORT_EVIDENCE } from '@/data/eventReportEvidence';
import { getEventReport, getThreefoldTarget } from '@/lib/eventReports';
import snapshot from '@/data/eventMetricsSnapshot.json';

describe('threefold event report targets', () => {
  it.each([
    [80, 240],
    [126, 378],
    [16, 48],
    [0, 0],
    [0.5, 1.5],
    [2.5, 7.5],
  ])('calculates a separate target for %s without rounding or replacing the baseline', (value, target) => {
    expect(getThreefoldTarget(value)).toBe(target);
  });

  it.each([null, undefined, -1, -0.5, NaN, Infinity, -Infinity])(
    'keeps an unavailable or invalid baseline unavailable: %s', value => {
      expect(getThreefoldTarget(value)).toBeNull();
    },
  );

  it('rejects overflow and values beyond the safe planning range', () => {
    const largestSafeIntegerBaseline = Math.floor(Number.MAX_SAFE_INTEGER / 3);
    expect(getThreefoldTarget(largestSafeIntegerBaseline)).toBe(largestSafeIntegerBaseline * 3);
    expect(getThreefoldTarget(largestSafeIntegerBaseline + 1)).toBeNull();
    expect(getThreefoldTarget(Number.MAX_SAFE_INTEGER)).toBeNull();
    expect(getThreefoldTarget(Number.MAX_VALUE)).toBeNull();
  });

  it('preserves recorded snapshot values and dates when targets are calculated', () => {
    const event = getBundledHackathon('impact-osaka-2026')!;
    const eventBefore = structuredClone(event);
    const snapshotBefore = structuredClone(snapshot);
    const evidenceBefore = structuredClone(EVENT_REPORT_EVIDENCE);
    const report = getEventReport(event);
    const reportBefore = structuredClone(report);
    const registrationMetric = report.metrics.find(metric => metric.id === 'approvedImportedRegistrations')!;
    const accountMetric = report.metrics.find(metric => metric.id === 'portalParticipantAccounts')!;

    expect(registrationMetric.value).toBe(80);
    expect(registrationMetric.asOf).toBe(fixtures.snapshot.capturedAt);
    expect(getThreefoldTarget(registrationMetric.value)).toBe(240);
    expect(accountMetric.value).toBe(16);
    expect(getThreefoldTarget(accountMetric.value)).toBe(48);
    expect(getThreefoldTarget(report.metrics.find(metric => metric.id === 'confirmed-attendance')?.value)).toBeNull();

    // Computing targets for all figures must never change their historical values or provenance.
    report.metrics.forEach(metric => getThreefoldTarget(metric.value));
    expect(report).toEqual(reportBefore);
    expect(snapshot).toEqual(snapshotBefore);
    expect(EVENT_REPORT_EVIDENCE).toEqual(evidenceBefore);
    expect(event).toEqual(eventBefore);
    expect(report.eventDate).toBe(eventBefore.eventDate);
    expect(getEventReport(event).metrics.find(metric => metric.id === 'approvedImportedRegistrations')?.value).toBe(80);
  });

  it('retains the sourced Luma label and unknown social figures after deriving planning targets', () => {
    const event = { ...getBundledHackathon('impact-osaka-2026')!, id: 'ai-ideathon-2026-q9pxii' };
    const report = getEventReport(event);
    const went = report.metrics.find(metric => metric.id === 'luma-went')!;
    const original = structuredClone(went);

    expect(went.value).toBe(126);
    expect(getThreefoldTarget(went.value)).toBe(378);
    expect(went).toEqual(original);
    expect(went.qualifier).toBe('Platform label');
    for (const id of ['confirmed-attendance', 'instagram-reach', 'linkedin-impressions']) {
      const metric = report.metrics.find(metric => metric.id === id)!;
      expect(metric.value).toBeNull();
      expect(getThreefoldTarget(metric.value)).toBeNull();
    }
  });
});
