import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { invalidateApiData } from "@/shared/lib/use-api-data";

afterEach(() => {
  cleanup();
  invalidateApiData();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
