/**
 * Given some TAB delimited file, upload the resulting statements to GraphKB
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input tab delimited file
 * @param {ApiConnection} opt.conn the API connection object
 */
export function uploadFile({ filename, conn, errorLogPrefix }: {
    filename: string;
    conn: any;
}): Promise<void>;
