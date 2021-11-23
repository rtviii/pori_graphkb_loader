import { uberon as SOURCE_DEFN } from "../sources";
/**
 * Given the path to an OWL file, upload the parsed ontology
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input OWL file
 * @param {ApiConnection} opt.conn the API connection object
 */
export function uploadFile({ filename, conn }: {
    filename: string;
    conn: any;
}): Promise<void>;
export declare const dependencies: string[];
export { SOURCE_DEFN };
