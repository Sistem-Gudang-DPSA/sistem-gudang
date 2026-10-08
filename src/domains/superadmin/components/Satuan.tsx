"use client";

import { createItemUnit, deleteItemUnit, renameItemUnit, listItemUnits } from "@/domains/inventory/api";
import MasterLookup from "./MasterLookup";

const config = { title: "Satuan Barang", singular: "Satuan", example: "Lembar", maxLength: 50, list: listItemUnits, create: createItemUnit, rename: renameItemUnit, remove: deleteItemUnit };

export default function Satuan() {
  return <MasterLookup config={config} />;
}
