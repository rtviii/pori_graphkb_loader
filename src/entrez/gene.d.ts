import { entrezGene as SOURCE_DEFN } from "../sources";
/**
 *
 * @param {ApiConnection} api connection to GraphKB
 * @param {Array.<string>} idList list of gene IDs
 */
declare function fetchAndLoadGeneByIds(api: any, idListIn: any): Promise<any[]>;
/**
 * Given a gene symbol, search the genes and upload the resulting records to graphkb
 * @param {ApiConnection} api connection to GraphKB
 * @param {string} symbol the gene symbol
 */
export function fetchAndLoadBySearchTerm(api: any, term: any, termType?: string, fallbackTermType?: any): Promise<any>;
export function fetchAndLoadBySymbol(api: any, term: any): Promise<any>;
/**
 * Given an gene record retrieved from entrez, parse it into its equivalent
 * GraphKB representation
 */
export function parseRecord(record: any): {
    biotype: string;
    description: any;
    displayName: any;
    longName: any;
    name: any;
    sourceId: any;
    url: string;
};
export function preLoadCache(api: any): Promise<void>;
export { SOURCE_DEFN, fetchAndLoadGeneByIds as fetchAndLoadByIds };
