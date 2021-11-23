import { cosmic as SOURCE_DEFN } from "../sources";
/**
 * Disease mappings
 */
export function loadClassifications(filename: any): Promise<{}>;
/**
 * Match the disease associated with the current record
 */
export function processDisease(conn: any, record: any): Promise<any>;
/**
 * Given some TAB delimited file, upload the resulting statements to GraphKB
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input tab delimited file
 * @param {ApiConnection} opt.conn the API connection object
 */
export function uploadFile({ filename, mappingFilename, conn, errorLogPrefix, }: {
    filename: string;
    conn: any;
}): Promise<void>;
export { SOURCE_DEFN };
