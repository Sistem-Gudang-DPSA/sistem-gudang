import { describe, expect, it } from "vitest";
import { getQuotaStatus } from "./quota";

describe("getQuotaStatus", () => {
  it("is Approved while the quota covers the request, including an exact fit", () => {
    expect(getQuotaStatus(10, 4)).toBe("Approved");
    expect(getQuotaStatus(4, 4)).toBe("Approved");
  });

  it("needs approval when the quota is short or used up", () => {
    expect(getQuotaStatus(3, 4)).toBe("Perlu Approval");
    expect(getQuotaStatus(0, 1)).toBe("Perlu Approval");
  });

  it("is not recorded without a dokubah entry", () => {
    expect(getQuotaStatus(null, 4)).toBe("Belum Terdata");
  });
});
