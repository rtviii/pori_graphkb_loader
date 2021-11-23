import { diseaseOntology as SOURCE_DEFN } from "../sources";
export function parseNodeRecord(record: any): {
    aliases: any[];
    deprecated: any;
    description: any;
    hasDeprecated: any[];
    name: any;
    ncitLinks: string[];
    sourceId: string;
    subsets: any;
};
/**
 * Parses the disease ontology json for disease definitions, relationships to other DO diseases and relationships to NCI disease terms
 *
 * @param {object} opt options
 * @param {string} opt.filename the path to the input JSON file
 * @param {ApiConnection} opt.conn the api connection object
 */
export function uploadFile({ filename, conn, ignoreCache }: {
    filename: string;
    conn: any;
}): Promise<void>;
export { SOURCE_DEFN };
