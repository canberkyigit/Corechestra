import { sanitizeProfileFields } from "./AuthContext";

describe("AuthContext profile security", () => {
  it("keeps editable profile fields and drops authorization fields", () => {
    expect(sanitizeProfileFields({
      fullName: "Alice Admin",
      timezone: "Europe/Istanbul",
      role: "admin",
      status: "active",
      deleted: false,
    })).toEqual({
      fullName: "Alice Admin",
      timezone: "Europe/Istanbul",
    });
  });
});
