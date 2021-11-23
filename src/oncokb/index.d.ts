import { oncokb as SOURCE_DEFN } from "../sources";
/**
 * Parse the variant string preresentation from oncokb to its graphkB equivalent
 */
export function parseVariantName(variantIn: any, { reference1 }?: {
    reference1: any;
}): {
    flipped: boolean;
    reference2: string;
    type: string;
} | {
    type: any;
    flipped?: undefined;
    reference2?: undefined;
};
declare const actionableRecordSpec: Ajv.ValidateFunction;
declare const annotatedRecordSpec: Ajv.ValidateFunction;
declare const curatedGeneSpec: Ajv.ValidateFunction;
declare const drugRecordSpec: Ajv.ValidateFunction;
/**
 * Upload the OncoKB statements from the OncoKB API into GraphKB
 *
 * @param {object} opt options
 * @param {string} [opt.url] the base url for fetching from the OncoKB Api
 * @param {ApiConnection} opt.conn the GraphKB api connection object
 */
export function upload(opt: {
    url?: string;
    conn: any;
}): Promise<void>;
import Ajv = require("ajv");
export declare const kb: boolean;
export declare namespace specs {
    export { actionableRecordSpec };
    export { annotatedRecordSpec };
    export { curatedGeneSpec };
    export { drugRecordSpec };
}
export { SOURCE_DEFN };
