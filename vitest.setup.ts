import { afterEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";
import { invalidateApiData } from "@/shared/lib/use-api-data";

// Whole-screen renders can need longer than the 1s default when the full suite runs in parallel.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  invalidateApiData();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
