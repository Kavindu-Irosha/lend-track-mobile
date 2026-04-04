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
        <td>${loan.purpose || 'Personal'}</td>
        <td>${formatCurrency(loan.amount)}</td>
        <td>${formatCurrency(loan.interest)}</td>
        <td>${formatCurrency(paid)}</td>
        <td style="font-weight: bold;">${formatCurrency(balance)}</td>
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
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .info-section { margin-bottom: 20px; display: flex; justify-content: space-between; }
          .info-box { flex: 1; }
          .info-label { font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
          .info-value { font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; padding: 12px; text-align: left; font-size: 12px; color: #495057; }
          td { padding: 12px; border-bottom: 1px solid #dee2e6; font-size: 13px; }
          .summary { margin-top: 30px; padding: 20px; background-color: #f1f3f5; borderRadius: 8px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .summary-total { border-top: 1px solid #dee2e6; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">LendTrack Statement</div>
          <div class="subtitle">Generated on ${format(new Date(), 'MMMM dd, yyyy')}</div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <div class="info-label">Customer Name</div>
            <div class="info-value">${customer.name}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Contact</div>
            <div class="info-value">${customer.phone || 'N/A'}</div>
          </div>
           <div class="info-box">
            <div class="info-label">NIC / ID</div>
            <div class="info-value">${customer.nic_number || 'N/A'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Purpose</th>
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
          <div class="summary-row">
            <span>Total Principal Disbursed:</span>
            <span>${formatCurrency(totalInv)}</span>
          </div>
          <div class="summary-row">
            <span>Total Interest Earned:</span>
            <span>${formatCurrency(totalInt)}</span>
          </div>
          <div class="summary-row">
            <span>Total Amount Collected:</span>
            <span>${formatCurrency(totalPaid)}</span>
          </div>
          <div class="summary-row summary-total">
            <span>Total Outstanding Balance:</span>
            <span>${formatCurrency(totalBal)}</span>
          </div>
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
  const exportedAt = format(new Date(), 'MMM dd, yyyy HH:mm:ss');

  const html = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; }
          .metadata { font-size: 12px; color: #888; text-align: right; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; padding: 12px; text-align: left; font-size: 12px; color: #495057; }
          td { padding: 12px; border-bottom: 1px solid #dee2e6; font-size: 13px; }
          .summary { margin-top: 30px; padding: 20px; background-color: #f1f3f5; border-radius: 8px; text-align: right; }
          .total-label { font-size: 14px; color: #495057; margin-bottom: 4px; }
          .total-value { font-size: 22px; font-weight: bold; color: #000; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Collections Report</div>
          <div class="subtitle">Period: ${periodLabel}</div>
        </div>
        
        <div class="metadata">
          Exported by Administrator on ${exportedAt}
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Method</th>
              <th>Ref ID</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="total-label">Total Collections Period Accumulation</div>
          <div class="total-value">${formatCurrency(total)}</div>
        </div>
      </body>
    </html>
  `;

  await generatePDF(html, `Collections_${periodLabel.replace(/\s/g, '_')}_${format(new Date(), 'HHmm')}.pdf`);
};
