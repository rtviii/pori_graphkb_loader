/**
 * wrapper to make requests less verbose
 */
export class ApiConnection {
    /**
     * @param {string} url the base url for the api
     */
    constructor(url: string);
    baseUrl        : string;
    headers        : {};
    username       : any;
    password       : any;
    exp            : any;
    created        : {};
    updated        : {};
    deleted        : {};
    pendingRequests: number;
    setAuth({ username, password }: {
        username: any;
        password: any;
    }): Promise<void>;
    login(): Promise<void>;
    /**
     * Make a request to the currently connected API
     * @param {object} opt
     * @param {string} opt.method the request method
     * @param {string} opt.uri the uri target
     * @param {object} opt.body the request body
     * @param {object} opt.qs the query parameters
     * @param {number} opt.retries number of times to retry the request
     * @param {number} opt.serverRetryTimeoutMs ms to wait to retry on a server error (could be someone is updating the db etc)
     * @param {number} opt.retryTimeoutMs ms to wait to retry a request due to a 429 error (too many requests)
     */
    request(opt: {
        method              : string;
        uri                 : string;
        body                : object;
        qs                  : object;
        retries             : number;
        serverRetryTimeoutMs: number;
        retryTimeoutMs      : number;
        })                  : any;
    getCreatedCounts(): {};
    /**
     * Given some query, fetch all matching records (handles paginating over large queries)
     * @param {Object} opt
     * @param {Object} opt.filters query filters
     * @param {string} opt.target the target class to be queried
     * @param {Number} opt.limit maximum number of records to fetch per request
     * @param {Number} opt.neighbors maximum record depth to fetch
     * @param {string[]} opt.returnProperties properties to return from each record
     */

    getRecords(opt: {
        filters?         : any;
        target           : string;
        limit?           : number;
        neighbors?       : number;
        returnProperties?: string[];
        })               : Promise<any[]>;

    getUniqueRecord(opt: any): Promise<any>;
    /**
     * Fetch a record with a query. Error if the record cannot be uniquely identified.
     *
     * @param {Object} opt
     * @param {Object} opt.filters query filters
     * @param {string} opt.target the target class to be queried
     * @param {Number} opt.limit maximum number of records to fetch per request
     * @param {Number} opt.neighbors maximum record depth to fetch
     * @param {function} opt.sort the comparator function to use in sorting if multiple results are found
     *
     * @throws on multiple records matching the query that do not have a non-zero sort comparison value
     */
    getUniqueRecordBy(opt: {
        filters   : any;
        target    : string;
        limit?    : number;
        neighbors?: number;
        sort?     : Function;
        })        : Promise<any>;

    /**
     * Fetch therapy by name, ignore plurals for some cases
     *
     * @param {string} term the name or sourceId of the therapeutic term
     * @param {string} source the source record ID the therapy is expected to belong to
     */
    getTherapy(term: string, source: string): Promise<any>;
    /**
     * @param {string} term the name of the vocabulary term to be fetched
     * @param {string} sourceName the name of the source the vocabulary term belongs to
     */
    getVocabularyTerm(term: string, sourceName?: string): Promise<any>;
    updateRecord(target: any, recordId: any, newContent: any): Promise<any>;
    /**
     * This will soft-delete a record via the API
     *
     * @param {string} target the class this record belongs to
     * @param {string} recordId the ID of the record being deleted
     */
    deleteRecord(target: string, recordId: string): Promise<any>;
    /**
     * @param {object  }  opt
     * @param {string  }  opt.target
     * @param {object  }  opt.content
     * @param {boolean } [opt.existsOk=false] do not error if a record cannot be created because it already exists
     * @param {object  } [opt.fetchConditions=null] the filters clause to be used in attempting to fetch this record
     * @param {boolean } [opt.fetchExisting=true] return the record if it already exists
     * @param {boolean } [opt.fetchFirst=false] attempt to fetch the record before trying to create it
     * @param {function}  opt.sortFunc function to be used in order records if multiple are returned to limit the result to 1
     */
    addRecord(opt: {
        target: string;
        content: object;
        existsOk?: boolean;
        fetchConditions?: object;
        fetchExisting?: boolean;
        fetchFirst?: boolean;
        sortFunc: Function;
    }): Promise<any>;
    addSource(content: any, opt?: {}): Promise<any>;
    /**
     * @param {object} opt
     * @param {object} opt.content the content of the variant record
     * @param {string} opt.target the class to add the record to (PositionalVariant or CategoryVariant)
     */
    addVariant(opt: {
        content: object;
        target: string;
    }): Promise<any>;
    /**
     * Add a therapy combination. Will split the input name by "+" and query to find individual
     * components. These will they be used to create the combination record
     *
     * TODO: link elements to combination therapy
     *
     * @param {string|Object} source the source record ID or source record this therapy belongs to
     * @param {string} therapyName the name of the therpeutic combination
     * @param {Object} opt
     * @param {boolean} opt.matchSource flag to indicate sub-components of the therapy must be from the same source
     */
    addTherapyCombination(source: string | any, therapyName: string, opt?: {
        matchSource: boolean;
    }): Promise<any>;
}
export const INTERNAL_SOURCE_NAME: string;
export function convertRecordToQueryFilters(record: any): {
    AND: {
        [x: string]: any;
    }[];
};
export function generateCacheKey(record: any): string;
/**
 * Given two node/vertex records do they share a common edge?
 */
export function haveSharedEdge(src: any, tgt: any, edgeType: any): boolean;
/**
 * Given two ontology terms, return the newer, non-deprecated, independant, term first.
 *
 * @param {object} term1 the first term record
 * @param {object} term2 the second term record
 *
 * @returns {Number} the sorting number (-1, 0, +1)
 */
export function orderPreferredOntologyTerms(term1: object, term2: object): number;
export function rid(record: any, nullOk: any): any;
/**
 * Check if things have changed and we should send an update request
 * @param {string|ClassModel} modelIn the model name or model object this record belongs to
 * @param {Object} originalContentIn the original record
 * @param {Object} newContentIn the new record
 * @param {string[]} upsertCheckExclude a list of properties to ignore changes in
 */
export function shouldUpdate(modelIn: string | any, originalContentIn: any, newContentIn: any, upsertCheckExclude?: string[]): boolean;
