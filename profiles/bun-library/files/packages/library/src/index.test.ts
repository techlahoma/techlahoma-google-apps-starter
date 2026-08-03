import { describe, expect, it } from "bun:test"

import { packageName } from "./index"

describe("package entry", () => {
  it("exposes the generated package identity", () => {
    expect(packageName).toBe("__PROJECT_SLUG__-library")
  })
})
