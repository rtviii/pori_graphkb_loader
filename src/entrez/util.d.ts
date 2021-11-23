export const BASE_FETCH_URL: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
export const BASE_URL: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
export namespace DEFAULT_QS {
    const retmode: string;
    const rettype: string;
}
/**
 * Given some list of pubmed IDs, return if cached,
 * If they do not exist, grab from the pubmed api
 * and then upload to GraphKB
 *
 * @param {ApiConnection} api connection to GraphKB
 * @param {Array.<string>} idListIn list of pubmed IDs
 * @param {Object} opt
 * @param {string} opt.dbName name of the entrez db to pull from ex. gene
 * @param {function} opt.parser function to convert records from the api to the graphkb format
 * @param {object} opt.cache
 * @param {number} opt.MAX_CONSEC maximum consecutive records to upload at once
 * @param {string} opt.target the graphkb api target to upload to
 * @param {object} opt.sourceDefn the object with the source information
 */
export function fetchAndLoadByIds(api: any, idListIn: Array<string>, { dbName, parser, cache, MAX_CONSEC, target, sourceDefn, }: {
    dbName: string;
    parser: Function;
    cache: object;
    MAX_CONSEC: number;
    target: string;
    sourceDefn: object;
}): Promise<any[]>;
/**
 * ex. https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?retmode=json&db=gene&rettype=docsum&term=kras[sym]
 *
 * @param {ApiConnection} api graphkb api connection
 * @param {string} term the search term ex. kras[sym]
 * @param {Object} opt
 * @param {string} opt.dbName name of the entrez db to pull from ex. gene
 * @param {function} opt.parser function to convert records from the api to the graphkb format
 * @param {object} opt.cache
 * @param {number} opt.MAX_CONSEC maximum consecutive records to upload at once
 * @param {string} opt.target the graphkb api target to upload to
 * @param {object} opt.sourceDefn the object with the source information
 */
export function fetchAndLoadBySearchTerm(api: any, term: string, opt: {
    dbName: string;
    parser: Function;
    cache: object;
    MAX_CONSEC: number;
    target: string;
    sourceDefn: object;
}): Promise<any[]>;
/**
 * Given some list of pumbed Ids, fetch the minimal parsed aricle summaries
 * @param {Array.<string>} pmidListIn list of pubmed ids
 * @param {object} opt
 * @param {string} [opt.url=BASE_URL] the base url for the pubmed api
 * @param {string} [opt.db='pubmed'] the entrez database name
 * @param {function} opt.parser the parser function to transform the entrez record to a graphkb record
 * @param {object} [opt.cache={}] the cache associated with calls to this db
 * @param {string} [opt.dbfrom=null] if querying by a linked ID must include the db you wish to retrieve from
 */
export function fetchByIdList(rawIdList: any, opt: {
    url?: string;
    db?: string;
    parser: Function;
    cache?: object;
    dbfrom?: string;
}): Promise<any[]>;
/**
 * Given some pubmed ID, get the corresponding record from GraphKB
 */
export function fetchRecord(api: any, { sourceId, sourceIdVersion, db, target, cache, }: {
    sourceId: any;
    sourceIdVersion?: any;
    db?: string;
    target?: string;
    cache?: {};
}): Promise<any>;
export function preLoadCache(api: any, { sourceDefn, cache, target }: {
    sourceDefn: any;
    cache: any;
    target: any;
}): Promise<void>;
/**
 * pull records from a cache where stored, return leftoever id's otherwise
 * @param {Array.<string>} rawIdList array of sourceIds to pull records from a cache by
 * @param {object} cache the cache to pull from
 */
export function pullFromCacheById(rawIdList: Array<string>, cache: object): {
    cached: any[];
    remaining: string[];
};
/**
 * Given the parsed content of some recrod, upload to the api
 * @param {object} content the record contents to be uploaded
 * @param {object} opt
 * @param {boolean} opt.cache add the GraphKB record to the cache
 * @param {boolean} opt.fetchFirst attempt to get the record by source Id before uploading it
 * @param {string} opt.target
 * @param {object} opt.sourceDefn
 * @param {function} opt.createDisplayName
 */
export function uploadRecord(api: any, content: object, opt?: {
    cache: boolean;
    fetchFirst: boolean;
    target: string;
    sourceDefn: object;
    createDisplayName: Function;
}): Promise<any>;
