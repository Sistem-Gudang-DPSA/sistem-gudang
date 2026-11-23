"use client";

import DataSupplierScreen from '@/domains/purchasing/components/DataSupplierScreen';

export default function DataSupplierSuperadmin() {
  return (
    <DataSupplierScreen
      detailHref={(id) => `/dashboard/superadmin/master/data-supplier/${id}/detail?from=superadmin`}
      paginationActiveClass="bg-indigo-500 text-white border-indigo-500"
    />
  );
}
