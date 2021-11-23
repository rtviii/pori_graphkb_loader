import { refseq as SOURCE_DEFN } from "../sources";
/**
 * Parse the tab delimited file to upload features and their relationships
 * For each versioned feature, a generalization (non-versioned) feature is created
 * to facilitate linking from other sources where the version may not be given
 *
 * @param {object} opt options
 * @param {string} opt.filename path to the tab delimited file
 * @param {ApiConnection} opt.conn the api connection object
 */
export function uploadFile(opt: {
    filename: string;
    conn: any;
}): Promise<void>;
export { SOURCE_DEFN };
