"use client";

import DataSupplierScreen from '@/domains/purchasing/components/DataSupplierScreen';

export default function DataSupplierPurchasing() {
  return (
    <DataSupplierScreen
      detailHref={(id) => `/dashboard/purchasing/master/data-supplier/${id}/detail?from=purchasing`}
      paginationActiveClass="bg-teal-500 text-white border-teal-500"
    />
  );
}
