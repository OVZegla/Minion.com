/**
 * Genere un vrai PDF minimal (1 page) pour les documents de demonstration.
 * Evite d'afficher des fichiers factices : les documents de la demo sont
 * reellement telechargeables et ouvrables.
 */
function escapePdf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function makeDemoPdf(title: string, lines: string[] = []): Blob {
  const body = [
    'BT',
    '/F1 16 Tf',
    '60 760 Td',
    `(${escapePdf(title)}) Tj`,
    '/F1 10 Tf',
    '0 -28 Td',
    '(Document de demonstration minion.com - contenu fictif) Tj',
    ...lines.flatMap((line) => ['0 -18 Td', `(${escapePdf(line)}) Tj`]),
    'ET',
  ].join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
