import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("submitted application values wrap unbroken text inside the card", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/equip/SubmittedView.tsx"),
    "utf8",
  );

  expect(source.match(/\[overflow-wrap:anywhere\]/g)).toHaveLength(2);
  expect(source.match(/whitespace-pre-wrap/g)).toHaveLength(2);
  expect(source).toContain("flex min-w-0 items-start");
  expect(source).toContain("min-w-0 flex-1");
});
