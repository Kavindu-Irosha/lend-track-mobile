import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { formatCurrency } from './utils';

export interface ReportData {
  title: string;
  customerName?: string;
  dateRange?: string;
  items: any[];
  summary: {
    totalAmount: number;
    totalInterest?: number;
    totalPaid?: number;
    totalBalance?: number;
  };
}

export const generatePDF = async (html: string, fileName: string) => {
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: fileName });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

export const generateCustomerStatement = async (customer: any, loans: any[]) => {
  const tableRows = loans.map(loan => {
    const total = Number(loan.amount) + Number(loan.interest);
    const paid = loan.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const balance = total - paid;
    
    return `
      <tr>
        <td>${format(new Date(loan.created_at), 'MMM dd, yyyy')}</td>
        <td>
          <div style="font-weight: bold;">${loan.purpose || 'Personal Loan'}</div>
          ${loan.collateral_details ? `<div style="font-size: 10px; color: #666;">Security: ${loan.collateral_details}</div>` : ''}
        </td>
        <td>${formatCurrency(loan.amount)}</td>
        <td>${formatCurrency(loan.interest)}</td>
        <td>${formatCurrency(paid)}</td>
        <td style="font-weight: bold; color: ${balance > 0 ? '#ef4444' : '#10b981'};">${formatCurrency(balance)}</td>
      </tr>
    `;
  }).join('');

  const totalInv = loans.reduce((sum, l) => sum + Number(l.amount), 0);
  const totalInt = loans.reduce((sum, l) => sum + Number(l.interest), 0);
  const totalPaid = loans.reduce((sum, l) => sum + (l.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0), 0);
  const totalBal = (totalInv + totalInt) - totalPaid;

  const html = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
          .branding h1 { margin: 0; color: #6366f1; font-size: 28px; font-weight: 900; }
          .branding p { margin: 4px 0 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
          .doc-type { text-align: right; }
          .doc-type h2 { margin: 0; font-size: 20px; color: #111; }
          .doc-type p { margin: 4px 0 0; font-size: 12px; color: #999; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; }
          .info-box h3 { font-size: 10px; color: #999; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
          .info-box p { margin: 0; font-size: 15px; font-weight: bold; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; padding: 12px 8px; text-align: left; font-size: 11px; color: #666; text-transform: uppercase; }
          td { padding: 14px 8px; border-bottom: 1px solid #eee; font-size: 13px; }
          
          .summary { margin-top: 50px; background-color: #f9fafb; padding: 25px; border-radius: 12px; border: 1px solid #e5e7eb; }
          .summary-title { font-size: 14px; font-weight: bold; margin-bottom: 15px; color: #111; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .summary-total { margin-top: 15px; padding-top: 15px; border-top: 2px dashed #dee2e6; display: flex; justify-content: space-between; align-items: center; }
          .total-label { font-size: 16px; font-weight: 900; color: #111; }
          .total-value { font-size: 24px; font-weight: 900; color: #6366f1; }
          
          .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="branding">
            <h1>LendTrack</h1>
            <p>Financial Services Management</p>
          </div>
          <div class="doc-type">
            <h2>Account Statement</h2>
            <p>Generated on ${format(new Date(), 'PPP')}</p>
          </div>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <h3>Customer Details</h3>
            <p>${customer.name}</p>
            <p style="font-weight: normal; font-size: 13px; color: #666;">${customer.phone || 'N/A'}</p>
          </div>
          <div class="info-box" style="text-align: right;">
            <h3>Identity Reference</h3>
            <p>${customer.nic_number || 'N/A'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Loan/Security</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-title">FINANCIAL CONSOLIDATION</div>
          <div class="summary-row">
            <span>Aggregated Principal Disbursed:</span>
            <span style="font-weight: 600;">${formatCurrency(totalInv)}</span>
          </div>
          <div class="summary-row">
            <span>Accrued Interest Income:</span>
            <span style="font-weight: 600;">${formatCurrency(totalInt)}</span>
          </div>
          <div class="summary-row" style="color: #10b981;">
            <span>Total Recouped Capital:</span>
            <span style="font-weight: 600;">- ${formatCurrency(totalPaid)}</span>
          </div>
          <div class="summary-total">
            <span class="total-label">TOTAL OUTSTANDING CAPITAL</span>
            <span class="total-value">${formatCurrency(totalBal)}</span>
          </div>
        </div>

        <div class="footer">
          <p>This is a legally binding record of financial transactions. Please verify all entries immediately.</p>
          <p>Managed via LendTrack Mobile Portal • Confidential Reference: ${customer.id.substring(0,8).toUpperCase()}</p>
        </div>
      </body>
    </html>
  `;

  await generatePDF(html, `Statement_${customer.name.replace(/\s/g, '_')}.pdf`);
};

export const generateCollectionReport = async (payments: any[], periodLabel: string) => {
  const tableRows = payments.map(payment => `
    <tr>
      <td>${format(new Date(payment.payment_date), 'MMM dd')}</td>
      <td>${payment.loans?.customers?.name || 'Unknown'}</td>
      <td>${payment.payment_method?.toUpperCase() || 'CASH'}</td>
      <td>${payment.reference_id || '-'}</td>
      <td style="text-align: right; font-weight: bold;">${formatCurrency(payment.amount)}</td>
    </tr>
  `).join('');

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const html = `
    <html>
      <head>
        <style>
          body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
          .header { border-bottom: 4px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; position: relative; }
          .logo { font-size: 28px; font-weight: 900; color: #6366f1; margin: 0; }
          .title { font-size: 20px; font-weight: 700; color: #111827; margin-top: 4px; }
          .period { font-size: 14px; color: #6b7280; font-weight: 500; }
          
          .badge-container { border: 2px solid #10b981; border-radius: 8px; padding: 4px 12px; display: inline-block; transform: rotate(-8deg); position: absolute; right: 0; top: 0; }
          .badge-text { color: #10b981; font-weight: 900; font-size: 16px; margin: 0; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; }
          td { padding: 14px 8px; border-bottom: 1px solid #f3f4f6; font-size: 13px; color: #374151; }
          .amount-col { text-align: right; font-weight: 600; }
          
          .summary { margin-top: 40px; background: #f9fafb; padding: 30px; border-radius: 20px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; align-items: flex-end; }
          .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px; }
          .summary-value { font-size: 36px; font-weight: 900; color: #6366f1; }
          
          .footer { margin-top: 80px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge-container"><p class="badge-text">VERIFIED</p></div>
          <p class="logo">LendTrack</p>
          <h1 class="title">Consolidated Collections Report</h1>
          <p class="period">Reporting Period: ${periodLabel}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Reference</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="summary">
          <p class="summary-label">Total Liquid Capital Recouped</p>
          <p class="summary-value">${formatCurrency(total)}</p>
        </div>
        
        <div class="footer">
          <p>Generated by Audit Authority on ${format(new Date(), 'PPP p')}</p>
          <p>This report serves as an official proof of collection for the specified period.</p>
        </div>
      </body>
    </html>
  `;

  await generatePDF(html, `Collections_${periodLabel.replace(/\s/g, '_')}_${format(new Date(), 'HHmm')}.pdf`);
};
