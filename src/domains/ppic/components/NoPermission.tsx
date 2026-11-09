export default function NoPermission({ action }: { action: string }) {
  return (
    <div role="alert" className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-10 text-center text-gray-500">
      Anda tidak punya izin untuk {action}.
    </div>
  );
}
