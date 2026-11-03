import { describe, expect, it } from 'vitest';
import { getBundledHackathon } from '@/lib/bundledHackathons';
import { portalHackathonAsHosted } from '@/lib/aiHackathons';
import { PORTAL_HACKATHONS } from '@/lib/hackathons';
import { EVENT_REPORT_EVIDENCE } from '@/data/eventReportEvidence';
import { getEventReport, getEventReportHref, getEventReportKey, safeReportSourceUrl } from '@/lib/eventReports';
const osaka=getBundledHackathon('impact-osaka-2026')!;
describe('public event reports',()=>{
  it('keeps unknown attendance and private social analytics unavailable, not zero',()=>{
    const report=getEventReport(osaka);
    for(const id of ['confirmed-attendance','instagram-reach','linkedin-impressions'])expect(report.metrics.find(row=>row.id===id)?.value).toBeNull();
    expect(report.coverage.instagram).toContain('not zero');
  });
  it('retains the precise Luma label rather than claiming checked-in attendance',()=>{
    const report=getEventReport({...osaka,id:'ai-ideathon-2026-q9pxii'});
    expect(report.metrics.find(row=>row.id==='luma-went')).toMatchObject({label:'Luma “Went”',value:126,qualifier:'Platform label'});
    expect(report.metrics.find(row=>row.id==='confirmed-attendance')?.value).toBeNull();
  });
  it('resolves archive identity without copying similarly named event statistics',()=>{
    expect(getEventReportKey({...osaka,id:'luma-e56k7x3v',lumaUrl:'https://luma.com/e56k7x3v',sourceUrl:''})).toBe('ai-ideathon-2026-q9pxii');
    expect(getEventReportKey({...osaka,id:'unrelated',lumaUrl:'',sourceUrl:''})).toBe('unrelated');
    expect(getEventReport({...osaka,id:'unrelated',lumaUrl:'',sourceUrl:''}).metrics.some(row=>row.id==='luma-went')).toBe(false);
    expect(getEventReport({...osaka,id:'unrelated',lumaUrl:'',sourceUrl:''}).checkedAt).toBe('');
  });
  it('supports every known event and safely encodes report links',()=>{
    for(const event of PORTAL_HACKATHONS)expect(getEventReport(portalHackathonAsHosted(event)).eventId).toBe(event.id);
    expect(getEventReportHref('event&id')).toBe('/reports?event=event%26id');
  });
  it('accepts only safe HTTPS evidence links',()=>{
    for(const value of ['javascript:alert(1)','http://example.com','https://user:secret@example.com','//example.com'])expect(safeReportSourceUrl(value)).toBeUndefined();
    expect(safeReportSourceUrl('https://luma.com/jnwil7tv')).toBe('https://luma.com/jnwil7tv');
  });
  it('gives every researched figure a definition, direct source and capture date',()=>{
    for(const evidence of Object.values(EVENT_REPORT_EVIDENCE))for(const metric of evidence.metrics??[]){
      expect(Number.isFinite(metric.value)).toBe(true);expect(metric.value).toBeGreaterThanOrEqual(0);
      expect(safeReportSourceUrl(metric.sourceUrl)).toBeTruthy();expect(metric.definition.length).toBeGreaterThan(20);expect(metric.asOf).toBe('2026-11-03');
    }
  });
});
