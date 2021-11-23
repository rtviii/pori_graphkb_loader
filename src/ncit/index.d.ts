import { ncit as SOURCE_DEFN } from "../sources";
/**
 * Given the path to some NCIT OWL file, upload the parsed ontology records
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input OWL file
 * @param {ApiRequst} opt.conn the API connection object
 */
export function uploadFile({ filename, conn, ignoreCache }: {
    filename: string;
    conn: any;
}): Promise<void>;
export { SOURCE_DEFN };
