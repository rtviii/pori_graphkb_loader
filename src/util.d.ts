export function checkSpec(spec: any, record: any, idGetter?: (rec: any) => any): boolean;
export function convertOwlGraphToJson(graph: any, idParser?: (x: any) => any): {};
/**
 * Remap object property names and return the object
 */
export function convertRowFields(header: any, row: any): {};
export function hashRecordToId(input: any, propertyList?: any): string;
export function hashStringToId(input: any): string;
export function loadDelimToJson(filename: any, opt?: {}): Promise<any>;
export function loadXmlToJson(filename: any, opts?: {}): Promise<any>;
export function parseXmlToJson(xmlContent: any, opts?: {}): Promise<any>;
/**
 *  Try again for too many requests errors. Helpful for APIs with a rate limit (ex. pubmed)
 */
export function requestWithRetry(requestOpt: any, { waitSeconds, retries }?: {
    waitSeconds?: number;
    retries?: number;
}): any;
