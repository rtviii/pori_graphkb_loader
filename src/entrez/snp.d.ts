import { dbSnp as SOURCE_DEFN } from "../sources";
/**
 * Given some list of pubmed IDs, return if cached,
 * If they do not exist, grab from the pubmed api
 * and then upload to GraphKB
 *
 * @param {ApiConnection} api connection to GraphKB
 * @param {Array.<string>} idList list of pubmed IDs
 */
export function fetchAndLoadByIds(api: any, idListIn: any): Promise<any[]>;
/**
 * Given an record record retrieved from pubmed, parse it into its equivalent
 * GraphKB representation
 */
export function parseRecord(record: any): {
    displayName: string;
    genes: any;
    hgvs: {};
    name: string;
    sourceId: any;
    sourceIdVersion: any;
    url: string;
};
export function preLoadCache(api: any): Promise<void>;
export { SOURCE_DEFN };
