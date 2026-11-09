import type { BadgeTone } from '@/shared/components/StatusBadge';
import type { MaterialRequestStatus, StatusQc } from './types';
import type { QuotaStatus } from './quota';

// Labels and colors of the Gudang statuses, shared by every page that shows them.
export const QC_STATUS: Record<StatusQc, { label: string; tone: BadgeTone }> = {
  PASS: { label: 'PASS', tone: 'green' },
  PARTIAL_RETUR: { label: 'RETUR', tone: 'amber' },
};

export const REQUEST_STATUS: Record<MaterialRequestStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Menunggu PPIC', tone: 'amber' },
  PROSES: { label: 'Menunggu Proses', tone: 'blue' },
  SELESAI: { label: 'Selesai', tone: 'green' },
};

export const QUOTA_TONE: Record<QuotaStatus, BadgeTone> = {
  Approved: 'green',
  'Perlu Approval': 'amber',
  'Belum Terdata': 'gray',
};
