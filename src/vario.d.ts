import { vario as SOURCE_DEFN } from "./sources";
/**
 * Parse the input OWL file and upload the ontology to GraphKB via the API
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input OWL file
 * @param {ApiConnection} opt.conn the api request connection object
 */
export function uploadFile({ filename, conn }: {
    filename: string;
    conn: any;
}): Promise<void>;
export { SOURCE_DEFN };
