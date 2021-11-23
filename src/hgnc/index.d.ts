import { hgnc as SOURCE_DEFN } from "../sources";
export const ensemblSourceName: string;
export function fetchAndLoadBySymbol({ conn, symbol, paramType, ignoreCache, }: {
    conn: any;
    symbol: any;
    paramType?: string;
    ignoreCache?: boolean;
}): Promise<any>;
/**
 * Upload the HGNC genes and ensembl links
 * @param {object} opt options
 * @param {string} opt.filename the path to the input JSON file
 * @param {ApiConnection} opt.conn the API connection object
 */
export function uploadFile(opt: {
    filename: string;
    conn: any;
}): Promise<void>;
/**
 * Upload a gene record and relationships from the corresponding HGNC record
 * @param {object} opt
 * @param {ApiConnection} opt.conn the graphkb api connection
 * @param {object.<string,object>} opt.source the source records
 * @param {object} opt.gene the gene record from HGNC
 */
export function uploadRecord({ conn, sources: { hgnc, ensembl }, gene, deprecated, }: {
    conn: any;
    source: any;
    gene: object;
}): Promise<any>;
export declare const dependencies: string[];
export { SOURCE_DEFN };
