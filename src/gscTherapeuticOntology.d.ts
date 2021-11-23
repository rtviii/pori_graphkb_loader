import { gscTherapeuticOntology as SOURCE_DEFN } from "./sources";
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
export declare const dependencies: string[];
export { SOURCE_DEFN };
