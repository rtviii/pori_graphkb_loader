import { chembl as SOURCE_DEFN } from "../sources";
/**
 * fetch drug by chemblId and load it into GraphKB
 * @param {ApiConnection} conn
 * @param {string} drugId
 */
export function fetchAndLoadById(conn: any, drugId: string): Promise<any>;
export function preLoadCache(api: any): Promise<void>;
export { SOURCE_DEFN };
