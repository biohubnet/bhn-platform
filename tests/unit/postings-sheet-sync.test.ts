import { expect, test } from "@playwright/test";
import { parseCsv, rowToPosting, sheetCsvUrl } from "../../src/lib/internships/sheet-sync";

const today = new Date("2026-09-29T00:00:00Z");
const row = {
  rowCreationISOTimestamp: "2026-08-13T14:41:29.356Z", jobID: "BHTAI0002", companyName: "Bough Biosciences",
  companyWebsite: "boughbio.com", jobTitle: "Experimental Lead", jobDescription: "Line one\nLine two",
  position_duration: "1 year", position_hours: "Full time", position_location: "Mississauga, ON",
  position_type: "On site", position_compensation: "", position_deadline: "2026-10-31T00:00:00.000Z",
  position_skills: "PBMC culture, Flow cytometry; PBMC culture", active_inactive: "active",
  emailAddress: "rep@example.com", passwordForCompanyForm: "secret", selectedStudents: "Someone",
};

test("parseCsv keeps quoted commas, newlines and doubled quotes inside one field", () => {
  expect(parseCsv('a,b\r\n"x, y","say ""hi""\nthere"\n')).toEqual([["a", "b"], ["x, y", 'say "hi"\nthere']]);
});

test("sheetCsvUrl turns an edit link into its CSV export, and refuses anything else", () => {
  expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/AbC_1-x/edit?gid=42#gid=42"))
    .toBe("https://docs.google.com/spreadsheets/d/AbC_1-x/export?format=csv&gid=42");
  expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/AbC/edit")).toContain("gid=0");
  expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/e/2PACX-1vQ/pubhtml?gid=7&single=true"))
    .toBe("https://docs.google.com/spreadsheets/d/e/2PACX-1vQ/pub?output=csv&gid=7");
  expect(sheetCsvUrl("https://docs.google.com/spreadsheets/d/e/edit")).toBeNull();
  for (const bad of ["", "http://docs.google.com/spreadsheets/d/AbC/edit", "https://evil.test/spreadsheets/d/AbC", "https://docs.google.com/document/d/AbC"])
    expect(sheetCsvUrl(bad)).toBeNull();
});

test("rowToPosting maps posting fields only, never contacts or the password column", () => {
  const p = rowToPosting(row, today)!;
  expect(p.id).toBe("sheet-BHTAI0002");
  expect(p.data).toMatchObject({
    companyName: "Bough Biosciences", title: "Experimental Lead", website: "https://boughbio.com",
    compensation: null, deadline: new Date("2026-10-31T00:00:00Z"), status: "active",
    keySkills: ["PBMC culture", "Flow cytometry"], positionDetails: "Line one\n\nLine two",
  });
  const flat = JSON.stringify(p);
  for (const leak of ["rep@example.com", "secret", "Someone"]) expect(flat).not.toContain(leak);
});

test("rowToPosting turns the form's plain lines and bullets into Markdown blocks", () => {
  const p = rowToPosting({ ...row, jobDescription: "About us\r\nWhat you'll do:\n• Run assays\n  ● Keep records\n\n\nApply" }, today)!;
  expect(p.data.positionDetails).toBe("About us\n\nWhat you'll do:\n\n- Run assays\n\n- Keep records\n\nApply");
});

test("rowToPosting status: active until the deadline passes, blank is a draft, inactive is closed", () => {
  expect(rowToPosting({ ...row, position_deadline: "2026-09-29" }, today)!.data.status).toBe("active");
  expect(rowToPosting({ ...row, position_deadline: "2026-09-28" }, today)!.data.status).toBe("closed");
  expect(rowToPosting({ ...row, position_deadline: "" }, today)!.data.status).toBe("active");
  expect(rowToPosting({ ...row, active_inactive: "" }, today)!.data.status).toBe("draft");
  expect(rowToPosting({ ...row, active_inactive: "Inactive" }, today)!.data.status).toBe("closed");
});

test("rowToPosting skips rows without a usable job ID, title or company", () => {
  expect(rowToPosting({ ...row, jobID: "" }, today)).toBeNull();
  expect(rowToPosting({ ...row, jobID: "../x" }, today)).toBeNull();
  expect(rowToPosting({ ...row, jobTitle: " " }, today)).toBeNull();
  expect(rowToPosting({ ...row, companyName: "" }, today)).toBeNull();
});
