import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toGeminiSchema } from "./gemini";

describe("schema gửi Gemini (structured output)", () => {
  it("chỉ dùng từ khoá Gemini hỗ trợ: bỏ $schema, trường nullable thành anyOf", () => {
    type Node = { properties: Record<string, { anyOf?: unknown[] }> };
    const schema = toGeminiSchema(z.object({ a: z.string(), b: z.number().nullable(), c: z.object({ d: z.boolean() }).nullable() })) as Node;
    expect(JSON.stringify(schema)).not.toContain("$schema");
    expect(schema.properties.b).toEqual({ anyOf: [{ type: "number" }, { type: "null" }] });
    const c = schema.properties.c.anyOf ?? [schema.properties.c];
    expect(JSON.stringify(c)).toContain('"d"');
    expect(JSON.stringify(schema)).not.toMatch(/"type":\[/);
  });
});
