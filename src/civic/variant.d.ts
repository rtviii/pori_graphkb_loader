/**
 * Dowmloads the variant records that are referenced by the evidence records
 */
export function downloadVariantRecords(): Promise<{}>;
/**
 * Given a CIViC Variant record entrez information and name, normalize into a set of graphkb-style variants
 */
export function normalizeVariantRecord({ name: rawName, entrezId, entrezName: rawEntrezName, }: {
    name: any;
    entrezId: any;
    entrezName: any;
}): any;
/**
 * Given some variant record and a feature, process the variant and return a GraphKB equivalent
 */
export function processVariantRecord(conn: any, civicVariantRecord: any, feature: any): Promise<any[]>;
/**
 * This is the expected format of the JSON body of a response to a variant request to the CIVIC API
 */
export const validateVariantSpec: Ajv.ValidateFunction;
import Ajv = require("ajv");
