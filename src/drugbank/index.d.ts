import { drugbank as SOURCE_DEFN } from "../sources";
/**
 * Given the input XML file, load the resulting parsed ontology into GraphKB
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input XML file
 * @param {ApiConnection} opt.conn the api connection object
 */
export function uploadFile({ filename, conn }: {
    filename: string;
    conn: any;
}): Promise<void>;
export declare const dependencies: string[];
export { SOURCE_DEFN };
