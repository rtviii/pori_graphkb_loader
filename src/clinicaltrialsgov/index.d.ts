import { clinicalTrialsGov as SOURCE_DEFN } from "../sources";
/**
 * Given some records from the API, convert its form to a standard represention
 */
export function convertAPIRecord(rawRecord: any): {
    completionDate: string;
    diseases: any;
    displayName: any;
    drugs: any[];
    locations: any[];
    name: any;
    recruitmentStatus: any;
    sourceId: any;
    sourceIdVersion: string;
    startDate: string;
    url: any;
};
/**
 * Given some NCT ID, fetch and load the corresponding clinical trial information
 *
 * https://clinicaltrials.gov/ct2/show/NCT03478891?displayxml=true
 */
export function fetchAndLoadById(conn: any, nctID: any, { upsert }?: {
    upsert?: boolean;
}): Promise<any>;
/**
 * Parses clinical trial RSS Feed results for clinical trials in Canada and the US
 * which were updated in the last 2 weeks
 */
declare function loadNewTrials({ conn }: {
    conn: any;
}): Promise<void>;
/**
 * Uploads a file exported from clinicaltrials.gov as XML
 * @param {object} opt
 * @param {ApiConnection} opt.conn the GraphKB connection object
 * @param {string} opt.filename the path to the XML export
 */
export function uploadFiles({ conn, files }: {
    conn: any;
    filename: string;
}): Promise<void>;
export declare const kb: boolean;
export { SOURCE_DEFN, loadNewTrials as upload };
