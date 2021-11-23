/**
 * Upload the JSON ontology file
 *
 * @param {object} opt
 * @param {string} opt.filename the path to the JSON input file
 * @param {ApiConnection} opt.conn the graphKB api connection
 */
export function uploadFile({ filename, conn }: {
    filename: string;
    conn: any;
}): Promise<void>;
/**
 * Upload the JSON ontology file
 *
 * @param {object} opt
 * @param {string} opt.data the JSON data to be loaded
 * @param {ApiConnection} opt.conn the graphKB api connection
 */
export function uploadFromJSON({ data, conn }: {
    data: string;
    conn: any;
}): Promise<void>;
