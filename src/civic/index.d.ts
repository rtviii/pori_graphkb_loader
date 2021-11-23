import { civic as SOURCE_DEFN } from "../sources";
declare const validateEvidenceSpec: Ajv.ValidateFunction;
/**
 * Extract the appropriate GraphKB relevance term from a CIViC evidence record
 */
export function translateRelevance(evidenceType: any, evidenceDirection: any, clinicalSignificance: any): any;
/**
 * Access the CIVic API, parse content, transform and load into GraphKB
 *
 * @param {object} opt options
 * @param {ApiConnection} opt.conn the api connection object for GraphKB
 * @param {string} [opt.url] url to use as the base for accessing the civic ApiConnection
 * @param {string[]} opt.trustedCurators a list of curator IDs to also fetch submitted only evidence items for
 */
export function upload(opt: {
    conn: any;
    url?: string;
    trustedCurators: string[];
}): Promise<void>;
import Ajv = require("ajv");
export declare namespace specs {
    export { validateEvidenceSpec };
}
export { SOURCE_DEFN };
