import { apiClient, downloadFile, toQuery } from "@/shared/lib/api-client";
import type { PaginatedResult } from "@/domains/inventory/types";
import type { CreateOutboundInput, OutboundReport, OutboundReportParams, OutboundListParams, OutboundRow, CreateInboundInput, InboundReport, InboundReportParams, CreateInboundReturnInput, InboundListParams, InboundRow } from "./types";

export function listInbound(params?: InboundListParams) {
  return apiClient.get<PaginatedResult<InboundRow>>(`/api/v1/inbound${toQuery(params)}`);
}

export function getInbound(id: number) {
  return apiClient.get<InboundRow>(`/api/v1/inbound/${id}`);
}

export function createInbound(input: CreateInboundInput) {
  return apiClient.post<InboundRow>("/api/v1/inbound", input);
}

export function createInboundReturn(input: CreateInboundReturnInput) {
  return apiClient.post<InboundRow>("/api/v1/inbound/returns", input);
}

// Report endpoints search with `q` (not `search`) and return a `summary`.
export function getInboundReport(params?: InboundReportParams) {
  return apiClient.get<InboundReport>(`/api/v1/reports/inbound${toQuery(params)}`);
}

export function exportInboundReport(params?: Omit<InboundReportParams, "page" | "pageSize">) {
  return downloadFile(`/api/v1/reports/inbound/export${toQuery(params)}`, "rekap-barang-masuk.xlsx");
}

export function listOutbound(params?: OutboundListParams) {
  return apiClient.get<PaginatedResult<OutboundRow>>(`/api/v1/outbound${toQuery(params)}`);
}

export function createOutbound(input: CreateOutboundInput) {
  return apiClient.post<OutboundRow>("/api/v1/outbound", input);
}

export function getOutboundReport(params?: OutboundReportParams) {
  return apiClient.get<OutboundReport>(`/api/v1/reports/outbound${toQuery(params)}`);
}

export function exportOutboundReport(params?: Omit<OutboundReportParams, "page" | "pageSize">) {
  return downloadFile(`/api/v1/reports/outbound/export${toQuery(params)}`, "rekap-barang-keluar.xlsx");
}
