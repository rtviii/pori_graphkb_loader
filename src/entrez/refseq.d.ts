import { refseq as SOURCE_DEFN } from "../sources";
export function cacheHas(key: any): boolean;
/**
 * Given some list of refseq IDs, return if cached,
 * If they do not exist, grab from the refseq graphkbConn
 * and then upload to GraphKB
 *
 * @param {ApiConnection} api connection to GraphKB
 * @param {Array.<string>} idList list of IDs
 */
export function fetchAndLoadByIds(api: any, idListIn: any): Promise<any[]>;
export function fetchAndLoadBySearchTerm(api: any, term: any, opt?: {}): Promise<any[]>;
/**
 * Given an record record retrieved from refseq, parse it into its equivalent
 * GraphKB representation
 */
export function parseRecord(record: any): {
    biotype: string;
    displayName: any;
    longName: any;
    sourceId: any;
    sourceIdVersion: any;
};
export function preLoadCache(api: any): Promise<void>;
export { SOURCE_DEFN };
