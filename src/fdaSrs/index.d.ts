import { fdaSrs as SOURCE_DEFN } from "../sources";
/**
 * Given the TAB delimited UNII records file. Load therapy records and NCIT links
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input file
 * @param {ApiConnection} opt.conn the api connection object
 */
export function uploadFile(opt: {
    filename: string;
    conn: any;
}): Promise<void>;
export declare const dependencies: string[];
export { SOURCE_DEFN };
