import { ensembl as SOURCE_DEFN } from "../sources";
export function fetchAndLoadById(conn: ApiConnection, { sourceId, sourceIdVersion, biotype }: {
    sourceId       : string;
    sourceIdVersion: string;
    biotype        : string
    })             : Promise<any>;
/**
 * Given a TAB delmited biomart export of Ensembl data, upload the features to GraphKB
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the tab delimited export file
 * @param {ApiConnection} opt.conn the api connection object
 */
export function uploadFile(opt: {
    filename: string;
    conn: any;
}): Promise<void>;
export { SOURCE_DEFN };
