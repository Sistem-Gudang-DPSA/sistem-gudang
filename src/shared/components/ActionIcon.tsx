import { Ban, Eye, Pencil, Printer, Trash2 } from 'lucide-react';

const icons = {
  detail: { Icon: Eye, color: 'text-blue-600' },
  edit: { Icon: Pencil, color: 'text-amber-600' },
  print: { Icon: Printer, color: 'text-orange-700' },
  delete: { Icon: Trash2, color: 'text-red-600' },
  cancel: { Icon: Ban, color: 'text-red-600' },
};

export default function ActionIcon({ action }: { action: keyof typeof icons }) {
  const { Icon, color } = icons[action];
  return <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />;
}
