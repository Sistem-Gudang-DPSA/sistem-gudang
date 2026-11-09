"use client";

import { createItemCategory, deleteItemCategory, renameItemCategory, listItemCategoriesPage } from "@/domains/inventory/api";
import MasterLookup from "./MasterLookup";

const config = { title: "Kategori Barang", singular: "Kategori", example: "Lembaran", maxLength: 100, withPrefix: true, list: listItemCategoriesPage, create: createItemCategory, rename: renameItemCategory, remove: deleteItemCategory };

export default function Kategori() {
  return <MasterLookup config={config} />;
}
