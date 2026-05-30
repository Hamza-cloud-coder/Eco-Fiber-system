// js/utils/taxEngine.ts
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const calculatePayslip = (
    basePay: number,
    commission: number,
    bonuses: number,
    advances: number
  ) => {
    const grossPay = basePay + commission + bonuses;
    
    // 2026 Tanzanian brackets (Income Tax PAYE)
    let paye = 0;
    if (grossPay <= 270000) {
      paye = 0;
    } else if (grossPay <= 520000) {
      paye = (grossPay - 270000) * 0.08;
    } else if (grossPay <= 760000) {
      paye = 20000 + (grossPay - 520000) * 0.20;
    } else if (grossPay <= 1000000) {
      paye = 68000 + (grossPay - 760000) * 0.25;
    } else {
      paye = 128000 + (grossPay - 1000000) * 0.30;
    }
    
    const totalDeductions = paye + advances;
    const netPayout = grossPay - totalDeductions;
    
    return {
      grossPay,
      paye,
      totalDeductions,
      netPayout
    };
  };

  export const triggerPDFExport = (
    username: string, 
    month: string,
    basePay: number,
    commission: number,
    bonuses: number,
    advances: number,
    paye: number,
    netPayout: number
  ) => {
    const doc = new jsPDF() as any;

    // Company Header / Branding
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229); // Indigo theme color
    doc.text('ECO ENGINEERING SOLUTIONS LTD', 14, 20);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('EcoOps Suite — Fiber Operations Payroll Hub', 14, 25);
    doc.text(`Payslip for Period: ${month.replace('_', ' ')}`, 14, 31);
    doc.text(`Employee Name: ${username}`, 14, 36);
    
    // Ledger table data rows
    const body = [
      ['Base Operations Pay', `${basePay.toLocaleString()} TZS`],
      ['Fiber Splicing Commissions', `${commission.toLocaleString()} TZS`],
      ['Work Order Checklist Bonuses', `${bonuses.toLocaleString()} TZS`],
      ['Gross Monthly Earnings', `${(basePay + commission + bonuses).toLocaleString()} TZS`],
      ['Tanzanian Income Tax (PAYE)', `-${paye.toLocaleString()} TZS`],
      ['Approved Salary Advances Deducted', `-${advances.toLocaleString()} TZS`],
      ['Net Take-Home Payout', `${netPayout.toLocaleString()} TZS`],
    ];

    // AutoTable layout compiling
    doc.autoTable({
      startY: 42,
      head: [['Earnings & Deductions Summary', 'Amount']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 120 },
        1: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('This is an auto-generated official corporate payslip from the EcoOps Suite. No physical signature is required.', 14, finalY);

    // Save and download locally
    doc.save(`Payslip_${username.replace(/\s+/g, '_')}_${month}.pdf`);
  };
