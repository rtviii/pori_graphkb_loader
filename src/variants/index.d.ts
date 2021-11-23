/**
 * Upload the HGNC genes from a list of symbols
 * @param {object} opt options
 * @param {string} opt.filename the path to the input JSON file
 * @param {ApiConnection} opt.conn the API connection object
 */
export function uploadFile(opt: {
    filename: string;
    conn: any;
}): Promise<void>;
