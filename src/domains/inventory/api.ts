import { apiClient, toQuery } from "@/shared/lib/api-client";
import type {
  CreateItemInput,
  CreateLocationInput,
  Item,
  ListParams,
  Location,
  PaginatedResult,
} from "./types";

export function listItems(params?: ListParams) {
  return apiClient.get<PaginatedResult<Item>>(`/api/v1/items${toQuery(params)}`);
}

export function getItem(id: number) {
  return apiClient.get<Item>(`/api/v1/items/${id}`);
}

export function createItem(input: CreateItemInput) {
  return apiClient.post<Item>("/api/v1/items", input);
}

export function updateItem(id: number, input: Partial<CreateItemInput>) {
  return apiClient.put<Item>(`/api/v1/items/${id}`, input);
}

export function deleteItem(id: number) {
  return apiClient.delete<Item>(`/api/v1/items/${id}`);
}

export function listUnassignedItems() {
  return apiClient.get<Item[]>("/api/v1/items/unassigned");
}

export function suggestItemCode(id: number, locationId: number) {
  return apiClient.get<{ code: string }>(`/api/v1/items/${id}/suggest-code?locationId=${locationId}`);
}

export function assignItemLocation(id: number, input: { code: string; locationId: number }) {
  return apiClient.put<Item>(`/api/v1/items/${id}/assign-location`, input);
}

export function adjustItemStock(id: number, input: { delta: number; reason: string }) {
  return apiClient.patch<Item>(`/api/v1/items/${id}/stock`, input);
}

export function listLocations(params?: ListParams) {
  return apiClient.get<PaginatedResult<Location>>(`/api/v1/locations${toQuery(params)}`);
}

export function createLocation(input: CreateLocationInput) {
  return apiClient.post<Location>("/api/v1/locations", input);
}

export function deleteLocation(id: number) {
  return apiClient.delete<void>(`/api/v1/locations/${id}`);
}
