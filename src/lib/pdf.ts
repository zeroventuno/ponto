import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale/it';

// Extend jsPDF with autotable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface PDFData {
    userName: string;
    month: Date;
    records: any[];
}

export const generateAttendancePDF = async ({ userName, month, records }: PDFData) => {
    const doc = new jsPDF();
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });
    const monthLabel = format(month, 'MMMM yyyy', { locale: it });

    // Colors from template
    const orangeBox = [255, 112, 67]; // #FF7043
    const greenBox = [165, 214, 167]; // #A5D6A7
    const yellowBox = [255, 235, 59]; // #FFEB3B
    const orangeDark = [230, 81, 0]; // Darker orange for footer

    // Header
    doc.setFontSize(18);
    doc.text(`Riepilogo Presenze: ${userName}`, 14, 20);
    doc.setFontSize(14);
    doc.text(`Periodo: ${monthLabel}`, 14, 28);

    // Prepare table data
    const parseTime = (time: string): number | null => {
        if (!time) return null;
        const [hours, minutes] = time.split(':').map(Number);
        return hours + minutes / 60;
    };

    let totalHours = 0;
    let totalOvertime = 0;
    let totalPermessi = 0;
    let totalFerie = 0;
    let workingDaysCount = 0;

    const formatDecimalToTime = (decimal: number) => {
        const h = Math.floor(decimal);
        const m = Math.round((decimal - h) * 60);
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const tableData = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const rec = records.find(r => r.work_date === dateStr);

        let h = 0;
        let overtime = 0;
        let permessi = 0;
        let ferie = 0;

        if (rec) {
            if (rec.is_vacation) {
                ferie = 8;
            } else {
                const mEnter = parseTime(rec.morning_enter);
                const mExit = parseTime(rec.morning_exit);
                const aEnter = parseTime(rec.afternoon_enter);
                const aExit = parseTime(rec.afternoon_exit);

                const mH = (mEnter !== null && mExit !== null) ? Math.max(0, mExit - mEnter) : 0;
                const aH = (aEnter !== null && aExit !== null) ? Math.max(0, aExit - aEnter) : 0;
                h = mH + aH;

                const THRESHOLD = 4;
                if (h > THRESHOLD) {
                    overtime = h - THRESHOLD;
                } else if (h < THRESHOLD && h > 0) {
                    permessi = THRESHOLD - h;
                }
            }

            if (h > 0 || rec.is_vacation) workingDaysCount++;
        }

        totalHours += h;
        totalOvertime += overtime;
        totalPermessi += permessi;
        totalFerie += ferie;

        return [
            format(day, 'EEEE, d MMMM yyyy', { locale: it }),
            h > 0 ? formatDecimalToTime(h) : '',
            overtime > 0 ? formatDecimalToTime(overtime) : '',
            '', // Empty col 1
            '', // Empty col 2
            ferie > 0 ? formatDecimalToTime(ferie) : '',
            permessi > 0 ? formatDecimalToTime(permessi) : ''
        ];
    });

    // Generate Table
    doc.autoTable({
        startY: 35,
        head: [['Data', 'Totale', 'Straord.', '', '', 'Ferie', 'Permessi']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [46, 125, 50],
            textColor: [255, 255, 255],
            fontSize: 10,
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { halign: 'center', fontStyle: 'bold' },
            2: { halign: 'center' },
            5: { halign: 'center', fillColor: [255, 243, 224] }, // Light orange for col
            6: { halign: 'center', fillColor: [232, 245, 233] }, // Light green for col
        },
        styles: { fontSize: 9 },
        didDrawCell: (data: any) => {
            // Add colors to specific cells if they have values
            if (data.section === 'body') {
                if (data.column.index === 5 && data.cell.text[0] !== '') {
                    doc.setTextColor(230, 81, 0); // Orange text
                }
                if (data.column.index === 6 && data.cell.text[0] !== '') {
                    doc.setTextColor(46, 125, 50); // Green text
                }
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 2;

    // Summatoria Row
    doc.autoTable({
        startY: finalY,
        body: [[
            'Sommatoria',
            formatDecimalToTime(totalHours),
            formatDecimalToTime(totalOvertime),
            '0:00',
            '0:00',
            formatDecimalToTime(totalFerie),
            formatDecimalToTime(totalPermessi)
        ]],
        theme: 'grid',
        styles: { fontSize: 11, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 60, fillColor: yellowBox },
            1: { fillColor: yellowBox },
            2: { fillColor: yellowBox },
            3: { fillColor: yellowBox },
            4: { fillColor: yellowBox },
            5: { fillColor: orangeBox, textColor: [255, 255, 255] },
            6: { fillColor: greenBox }
        }
    });

    const summaryY = (doc as any).lastAutoTable.finalY + 10;

    // Bottom Summary Boxes
    const boxW = 35;
    const boxH = 15;

    // (A) Giorni Lavorati
    doc.setFillColor(yellowBox[0], yellowBox[1], yellowBox[2]);
    doc.rect(14, summaryY, boxW, boxH, 'F');
    doc.setDrawColor(0);
    doc.rect(14, summaryY, boxW, boxH, 'D');
    doc.setFontSize(8);
    doc.text('(A) GIORNI', 16, summaryY + 6);
    doc.text('LAVORATI', 16, summaryY + 10);
    doc.setFontSize(12);
    doc.text(workingDaysCount.toString(), 14 + boxW - 8, summaryY + 9, { align: 'right' });

    // Ore Standard
    const standardSecX = 14 + boxW + 5;
    doc.setFillColor(yellowBox[0], yellowBox[1], yellowBox[2]);
    doc.rect(standardSecX, summaryY, boxW * 2, boxH, 'F');
    doc.rect(standardSecX, summaryY, boxW * 2, boxH, 'D');
    doc.setFontSize(8);
    doc.text('tot ore STANDARD', standardSecX + 2, summaryY + 6);
    doc.text('= A * 4h', standardSecX + 2, summaryY + 10);
    doc.setFontSize(12);
    doc.text(formatDecimalToTime(workingDaysCount * 4), standardSecX + boxW * 2 - 5, summaryY + 9, { align: 'right' });

    // Final Totals
    const finalTotalsX = standardSecX + boxW * 2 + 5;

    // Ferie Box
    doc.setFillColor(orangeDark[0], orangeDark[1], orangeDark[2]);
    doc.rect(finalTotalsX, summaryY, boxW, boxH, 'F');
    doc.rect(finalTotalsX, summaryY, boxW, boxH, 'D');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(formatDecimalToTime(totalFerie), finalTotalsX + boxW / 2, summaryY + 9, { align: 'center' });

    // Permessi Box
    doc.setFillColor(greenBox[0], greenBox[1], greenBox[2]);
    doc.rect(finalTotalsX + boxW, summaryY, boxW, boxH, 'F');
    doc.rect(finalTotalsX + boxW, summaryY, boxW, boxH, 'D');
    doc.setTextColor(0, 0, 0);
    doc.text(formatDecimalToTime(totalPermessi), finalTotalsX + boxW + boxW / 2, summaryY + 9, { align: 'center' });

    // Save PDF
    doc.save(`Ponto_${userName.replace(' ', '_')}_${format(month, 'MM_yyyy')}.pdf`);
};
