import { db } from '../database/db.js';

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateScanReportJson(scanId: string) {
  const scan = db.prepare('SELECT * FROM scan_history WHERE id = ?').get(scanId) as any;
  if (!scan) return null;

  const findings = db.prepare('SELECT * FROM scan_findings WHERE scan_id = ?').all(scanId) as any[];

  return {
    projectName: 'CyberSentinel AI',
    tagline: 'Detect. Analyze. Protect.',
    reportGeneratedAt: new Date().toISOString(),
    scanDetails: {
      scanId: scan.id,
      moduleName: scan.module_name,
      targetEnvironment: scan.target_environment,
      startTime: scan.start_time,
      completionTime: scan.completion_time,
      status: scan.status,
      summary: scan.summary,
      metrics: {
        findingsCount: scan.findings_count,
        warningsCount: scan.warnings_count,
        passedCount: scan.passed_count,
        errorsCount: scan.errors_count || 0,
        untestedCount: scan.untested_count || 0
      }
    },
    findings: findings.map(f => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      category: f.category,
      affectedTarget: f.affected_target,
      evidence: f.evidence,
      riskExplanation: f.risk_explanation,
      remediation: f.remediation,
      status: f.status
    })),
    disclaimer: 'CyberSentinel AI reports are generated for authorized educational security assessments and local demonstration targets only.'
  };
}

export function generateScanReportHtml(scanId: string): string | null {
  const data = generateScanReportJson(scanId);
  if (!data) return null;

  const s = data.scanDetails;

  const findingsRows = data.findings.map(f => {
    const badgeColor = f.severity === 'HIGH' ? '#EF4444' : f.severity === 'MEDIUM' ? '#F59E0B' : f.severity === 'LOW' ? '#3B82F6' : '#10B981';
    return `
      <tr style="border-bottom: 1px solid #1F2937;">
        <td style="padding: 12px; font-weight: 600; color: #F3F4F6;">${escapeHtml(f.title)}</td>
        <td style="padding: 12px;">
          <span style="background: ${badgeColor}22; color: ${badgeColor}; border: 1px solid ${badgeColor}44; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
            ${escapeHtml(f.severity)}
          </span>
        </td>
        <td style="padding: 12px; color: #9CA3AF; font-family: monospace;">${escapeHtml(f.category)}</td>
        <td style="padding: 12px; color: #D1D5DB; font-family: monospace; font-size: 13px;">${escapeHtml(f.affectedTarget)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #374151; background: #111827;">
        <td colspan="4" style="padding: 12px 16px;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #9CA3AF;"><strong>Evidence:</strong> <code style="color: #06B6D4; background: #0B0F19; padding: 2px 6px; border-radius: 3px;">${escapeHtml(f.evidence)}</code></p>
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #D1D5DB;"><strong>Risk Explanation:</strong> ${escapeHtml(f.riskExplanation)}</p>
          <p style="margin: 0; font-size: 13px; color: #10B981;"><strong>Remediation:</strong> ${escapeHtml(f.remediation)}</p>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>CyberSentinel AI Security Report - ${escapeHtml(s.scanId)}</title>
      <style>
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: #0B0F19; color: #F3F4F6; margin: 0; padding: 40px; }
        .container { max-width: 900px; margin: 0 auto; background: #111827; border: 1px solid #1F2937; border-radius: 12px; padding: 32px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1F2937; padding-bottom: 20px; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: bold; color: #06B6D4; }
        .tagline { font-size: 13px; color: #9CA3AF; }
        .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; background: #0B0F19; padding: 16px; border-radius: 8px; }
        .meta-item { font-size: 14px; }
        .meta-label { color: #9CA3AF; margin-bottom: 4px; font-size: 12px; text-transform: uppercase; }
        .meta-val { font-weight: 600; color: #F3F4F6; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; padding: 12px; background: #1F2937; color: #9CA3AF; font-size: 12px; text-transform: uppercase; }
        .summary-box { background: rgba(6, 182, 212, 0.1); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .footer { margin-top: 32px; pt-4; border-top: 1px solid #1F2937; font-size: 12px; color: #6B7280; text-align: center; }
        @media print {
          body { background-color: #fff; color: #000; }
          .container { border: none; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <div class="logo">CyberSentinel AI</div>
            <div class="tagline">${escapeHtml(data.tagline)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #9CA3AF;">REPORT ID</div>
            <div style="font-family: monospace; font-weight: bold; color: #06B6D4;">${escapeHtml(s.scanId)}</div>
          </div>
        </div>

        <div class="summary-box">
          <h3 style="margin: 0 0 8px 0; color: #06B6D4;">Assessment Summary</h3>
          <p style="margin: 0; font-size: 14px; color: #E5E7EB;">${escapeHtml(s.summary)}</p>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <div class="meta-label">Module Tested</div>
            <div class="meta-val">${escapeHtml(s.moduleName)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Target Environment</div>
            <div class="meta-val">${escapeHtml(s.targetEnvironment)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Test Timestamp</div>
            <div class="meta-val">${escapeHtml(s.startTime)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Metrics Summary</div>
            <div class="meta-val" style="color: #10B981;">
              ${s.metrics.findingsCount} Findings | ${s.metrics.warningsCount} Warnings | ${s.metrics.passedCount} Passed
            </div>
          </div>
        </div>

        <h3 style="color: #F3F4F6; margin-top: 24px;">Detailed Findings & Recommendations</h3>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Severity</th>
              <th>Category</th>
              <th>Affected Target</th>
            </tr>
          </thead>
          <tbody>
            ${findingsRows}
          </tbody>
        </table>

        <div class="footer">
          <p>${escapeHtml(data.disclaimer)}</p>
          <p>Generated on ${new Date().toLocaleString()} by CyberSentinel AI Platform</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
