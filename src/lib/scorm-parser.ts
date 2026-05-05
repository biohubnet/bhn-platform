import { parseStringPromise } from "xml2js";

export type ScormVersion = "SCORM_12" | "SCORM_2004";

export interface ScormManifest {
  version: ScormVersion;
  title: string;
  entryPoint: string;
  identifier: string;
  description?: string;
  duration?: string;
}

export async function parseManifest(xmlContent: string): Promise<ScormManifest> {
  const parsed = await parseStringPromise(xmlContent, { explicitArray: false });
  const manifest = parsed.manifest;

  // Detect version
  const schemaVersion: string =
    manifest?.metadata?.schemaversion?._ ??
    manifest?.metadata?.schemaversion ??
    "";
  const version: ScormVersion = schemaVersion.startsWith("2004") ? "SCORM_2004" : "SCORM_12";

  // Title
  const orgs = manifest?.organizations?.organization;
  const org = Array.isArray(orgs) ? orgs[0] : orgs;
  const title: string = org?.title ?? "Untitled Course";

  // Entry point: first resource href
  const resources = manifest?.resources?.resource;
  const resource = Array.isArray(resources) ? resources[0] : resources;
  const entryPoint: string = resource?.$?.href ?? "index.html";
  const identifier: string = resource?.$?.identifier ?? manifest?.$?.identifier ?? "course";

  return { version, title, entryPoint, identifier };
}
