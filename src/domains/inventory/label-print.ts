import { escapeHtml } from '@/shared/lib/escape-html';
import { cetakHtml } from '@/shared/lib/print-html';

type LabelItem = { code: string | null; name: string; externalCode?: string | null; locationCode?: string | null };

// Label size in mm; change here once the label paper is known.
const LABEL_W = 60;
const LABEL_H = 40;
const QR_SIZE = 26;

// The QR holds exactly items.code, which is what the USB scanner types into Barang Masuk. Kode bawaan and location are text only.
export async function buildLabelsHtml(items: LabelItem[]): Promise<string> {
  const { default: QRCode } = await import('qrcode');
  const labels = await Promise.all(
    items
      .filter((it): it is LabelItem & { code: string } => !!it.code)
      .map(async (it) => {
        const svg = await QRCode.toString(it.code, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
        const bawaan = it.externalCode ? `<span>[${escapeHtml(it.externalCode)}]</span>` : '';
        return `<div class="label"><div class="qr">${svg}</div><div class="txt"><span class="code"> ${escapeHtml(it.code)}</span><b>${escapeHtml(it.name)}</b>${bawaan}<span>${escapeHtml(it.locationCode ?? '-')}</span></div></div>`;
      }),
  );
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Label QR Barang</title>
<style>
  @page { margin: 8mm; }
  body { margin: 0; font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; gap: 2mm; }
  .label { width: ${LABEL_W}mm; height: ${LABEL_H}mm; box-sizing: border-box; border: 0.3mm dashed #999; padding: 3mm; display: flex; align-items: center; gap: 3mm; page-break-inside: avoid; }
  .qr { width: ${QR_SIZE}mm; height: ${QR_SIZE}mm; flex: none; }
  .qr svg { width: 100%; height: 100%; }
  .txt { display: flex; flex-direction: column; gap: 1mm; font-size: 9pt; overflow: hidden; }
  .txt .code { font-family: monospace; font-size: 10pt; }
</style></head>
<body>${labels.join('')}</body></html>`;
}

// Returns an error message, or null when the print dialog opened.
export async function printItemLabels(items: LabelItem[]): Promise<string | null> {
  if (!items.some((it) => it.code)) return 'Tidak ada barang berkode untuk dicetak.';
  let html: string;
  try {
    html = await buildLabelsHtml(items);
  } catch {
    return 'Gagal membuat label QR.';
  }
  try {
    await cetakHtml(html, 'label barang');
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Gagal mencetak label.';
  }
}
