import { docm as SOURCE_DEFN } from "../sources";
declare const recordSpec: Ajv.ValidateFunction;
declare const variantSummarySpec: Ajv.ValidateFunction;
/**
 * Uses the DOCM API to pull content, parse it and load it into GraphKB
 *
 * @param {object} opt options
 * @param {ApiConnection} opt.conn the api connection object for GraphKB
 * @param {string} [opt.url] the base url for the DOCM api
 */
export function upload(opt: {
    conn: any;
    url?: string;
}): Promise<void>;
import Ajv = require("ajv");
export declare namespace specs {
    export { recordSpec };
    export { variantSummarySpec };
}
export { SOURCE_DEFN };
