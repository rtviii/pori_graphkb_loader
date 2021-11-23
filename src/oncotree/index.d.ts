export class OncotreeAPI {
    constructor(baseurl: any);
    baseurl: any;
    /**
     * Retrieve version information from the oncotree api
     */
    getVersions(): Promise<any[]>;
    getRecords(versionApiKey: any): Promise<any>;
    /**
     * Retrieve records for each version from the oncotree api
     *
     */
    getAllRecords(versions: any): Promise<any[]>;
}
import { oncotree as SOURCE_DEFN } from "../sources";
/**
 * Use the oncotree REST API to pull down ontology information and then load it into the GraphKB API
 *
 * @param {object} opt options
 * @param {ApiConnection} opt.conn the GraphKB API connection object
 * @param {string} opt.url the base url to use in connecting to oncotree
 */
export function upload(opt: {
    conn: any;
    url: string;
}): Promise<void>;
export declare const dependencies: string[];
export { SOURCE_DEFN };
