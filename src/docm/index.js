/**
 * Module to import variant information from http://www.docm.info/api
 *
 * @module importer/docm
 */
const request = require('request-promise');
const Ajv = require('ajv');
const fs = require('fs');

const { variant: { parse: variantParser } } = require('@bcgsc-pori/graphkb-parser');

const { checkSpec } = require('../util');
const {
    orderPreferredOntologyTerms, rid,
} = require('../graphkb');
const _pubmed = require('../entrez/pubmed');
const { logger } = require('../logging');
const _gene = require('../entrez/gene');
const { docm: SOURCE_DEFN } = require('../sources');

const ajv = new Ajv();


const BASE_URL = 'http://docm.info/api/v1/variants';


const variantSummarySpec = ajv.compile({
    properties: {
        hgvs: { type: 'string' },
    },
    required: ['hgvs'],
    type: 'object',
});


const recordSpec = ajv.compile({
    properties: {
        amino_acid: { pattern: '^p\\..*', type: 'string' },
        chromosome: { type: 'string' },
        gene: { type: 'string' },
        hgvs: { type: 'string' },
        // TODO: process drug interactions (large amount of free text currently)
        meta: {
            items: {
                properties: {
                    'Drug Interaction Data': {
                        properties: {
                            fields: {
                                items: [
                                    { enum: ['Therapeutic Context'], type: 'string' },
                                    { enum: ['Pathway'], type: 'string' },
                                    { enum: ['Effect'], type: 'string' },
                                    { enum: ['Association'], type: 'string' },
                                    { enum: ['Status'], type: 'string' },
                                    { enum: ['Evidence'], type: 'string' },
                                    { enum: ['Source'], type: 'string' },
                                ],
                                type: 'array',
                            },
                            rows: {
                                items: {
                                    items: { type: ['string', 'null'] }, maxItems: 7, minItems: 7, type: 'array',
                                },
                                type: 'array',
                            },
                        },
                        required: ['fields', 'rows'],
                        type: 'object',
                    },
                },
                required: ['Drug Interaction Data'],
                type: 'object',
            },
            type: 'array',
        },
        reference: { pattern: '^([ATGC]*|-)$', type: 'string' },
        reference_version: { type: 'string' },
        start: { min: 1, type: 'number' },
        stop: { min: 1, type: 'number' },
        variant: { pattern: '^([ATGC]*|-)$', type: 'string' },
        variant_type: { enum: ['SNV', 'DEL', 'INS', 'DNV'], type: 'string' },
    },
    required: ['reference_version', 'hgvs', 'gene', 'reference', 'variant', 'start', 'stop', 'variant_type'],
    type: 'object',
});


/**
 * Parse DOCM specific protein notation into standard HGVS
 */
const parseDocmVariant = (variant) => {
    let match;

    if (match = /^p\.([A-Z]+)(\d+)-$/.exec(variant)) {
        const [, seq] = match;
        const pos = parseInt(match[2], 10);

        if (seq.length === 1) {
            return `p.${seq}${pos}del${seq}`;
        }
        return `p.${seq[0]}${pos}_${seq[seq.length - 1]}${pos + seq.length - 1}del${seq}`;
    } if (match = /^p\.([A-Z][A-Z]+)(\d+)([A-WYZ]+)$/.exec(variant)) { // ignore X since DOCM appears to use it to mean frameshift
        let [, refseq, pos, altSeq] = match;
        pos = parseInt(match[2], 10);
        let prefix = 0;

        for (let i = 0; i < refseq.length && i < altSeq.length; i++) {
            if (altSeq[i] !== refseq[i]) {
                break;
            }
            prefix++;
        }
        pos += prefix;
        refseq = refseq.slice(prefix);
        altSeq = altSeq.slice(prefix);

        if (refseq.length !== 0 && altSeq.length !== 0) {
            if (refseq.length > 1) {
                return `p.${refseq[0]}${pos}_${refseq[refseq.length - 1]}${pos + refseq.length - 1}del${refseq}ins${altSeq}`;
            }
            return `p.${refseq[0]}${pos}del${refseq}ins${altSeq}`;
        }
    }
    return variant;
};

/**
 * Create the string representation of the genomic variant
 */
const buildGenomicVariant = ({
    reference, variant, chromosome, start, stop, variant_type: variantType,
}) => {
    if (variantType === 'SNV') {
        return `${chromosome}:g.${start}${reference}>${variant}`;
    } if (variantType === 'DEL') {
        if (start === stop) {
            return `${chromosome}:g.${start}del${reference}`;
        }
        return `${chromosome}:g.${start}_${stop}del${reference}`;
    } if (variantType === 'INS') {
        return `${chromosome}:g.${start}_${stop}ins${variant}`;
    }
    if (start === stop) {
        return `${chromosome}:g.${start}del${reference}ins${variant}`;
    }
    return `${chromosome}:g.${start}_${stop}del${reference}ins${variant}`;
};

/**
 * Create the protein and genomic variants
 */
const processVariants = async ({ conn, source, record: docmRecord }) => {
    const {
        amino_acid: aminoAcid,
        gene,
        chromosome,
        reference_version: assembly,
        start,
        stop,
    } = docmRecord;
    // get the feature by name
    let protein,
        genomic;

    try {
        // create the protein variant
        const [reference1] = await _gene.fetchAndLoadBySymbol(conn, gene);
        let variant = variantParser(parseDocmVariant(aminoAcid), false).toJSON();
        const type = await conn.getVocabularyTerm(variant.type);
        protein = variant = await conn.addVariant({
            content: { ...variant, reference1: rid(reference1), type: rid(type) },
            existsOk: true,
            target: 'PositionalVariant',
        });
    } catch (err) {
        logger.error(`Failed to process protein notation (${gene}:${aminoAcid})`);
        throw err;
    }

    try {
        // create the genomic variant
        let variant = variantParser(buildGenomicVariant(docmRecord), false).toJSON();
        const type = await conn.getVocabularyTerm(variant.type);
        const reference1 = await conn.getUniqueRecordBy({
            filters: {
                AND: [
                    {
                        OR: [
                            { sourceId: chromosome },
                            { name: chromosome },
                        ],
                    },
                    { biotype: 'chromosome' },
                ],
            },
            sortFunc: orderPreferredOntologyTerms,
            target: 'Feature',
        });
        genomic = variant = await conn.addVariant({
            content: {
                ...variant, assembly: assembly.toLowerCase().trim(), reference1: rid(reference1), type,
            },
            existsOk: true,
            target: 'PositionalVariant',
        });
    } catch (err) {
        logger.error(`Failed to process genomic notation (${chromosome}.${assembly}:g.${start}_${stop})`);
        logger.error(err);
    }

    // TODO: create the cds variant? currently unclear if cdna or cds notation
    // link the variants together
    if (genomic) {
        await conn.addRecord({
            content: { in: rid(protein), out: rid(genomic), source: rid(source) },
            existsOk: true,
            fetchExisting: false,
            target: 'Infers',
        });
    }
    // return the protein variant
    return protein;
};


const processRecord = async (opt) => {
    const {
        conn, source, record,
    } = opt;
    // get the record details
    const counts = { error: 0, skip: 0, success: 0 };

    // get the variant
    const variant = await processVariants({ conn, record, source });

    if (!variant) {
        throw new Error('Failed to parse either variant');
    }

    for (const diseaseRec of record.diseases) {
        if (!diseaseRec.tags || diseaseRec.tags.length !== 1) {
            counts.skip++;
            continue;
        }

        try {
            // get the vocabulary term
            const relevance = await conn.getVocabularyTerm(diseaseRec.tags[0]);
            // get the disease by name
            const disease = await conn.getUniqueRecordBy({
                filters: {
                    AND: [
                        { sourceId: `doid:${diseaseRec.doid}` },
                        { source: { filters: { name: 'disease ontology' }, target: 'Source' } },
                    ],
                },
                sort: orderPreferredOntologyTerms,
                target: 'Disease',
            });
            // get the pubmed article
            const [publication] = await _pubmed.fetchAndLoadByIds(conn, [diseaseRec.source_pubmed_id]);
            // now create the statement
            await conn.addRecord({
                content: {
                    conditions: [rid(disease), rid(variant)],
                    evidence: [rid(publication)],
                    relevance: rid(relevance),
                    reviewStatus: 'not required',
                    source: rid(source),
                    sourceId: record.hgvs,
                    subject: rid(disease),
                },
                existsOk: true,
                fetchConditions: {
                    AND: [
                        { sourceId: record.hgvs },
                        { source: rid(source) },
                        { subject: rid(disease) },
                        { relevance: rid(relevance) },
                        { evidence: [rid(publication)] },
                    ],
                },
                fetchExisting: false,
                target: 'Statement',
                upsert: true,
            });
            counts.success++;
        } catch (err) {
            logger.error((err.error || err).message);
            console.error(err);
            counts.error++;
        }
    }
    return counts;
};


/**
 * Uses the DOCM API to pull content, parse it and load it into GraphKB
 *
 * @param {object} opt options
 * @param {ApiConnection} opt.conn the api connection object for GraphKB
 * @param {string} [opt.url] the base url for the DOCM api
 */
const upload = async (opt) => {
    const { conn, errorLogPrefix } = opt;
    // load directly from their api:
    logger.info(`loading: ${opt.url || BASE_URL}.json`);
    const recordsList = await request({
        json: true,
        method: 'GET',
        uri: `${BASE_URL}.json`,
    });
    logger.info(`loaded ${recordsList.length} records`);
    // add the source node
    const source = rid(await conn.addSource(SOURCE_DEFN));

    const counts = {
        error: 0, existing: 0, highlight: 0, skip: 0, success: 0,
    };
    const filtered = [];
    const pmidList = [];
    const errorList = [];

    const existingRecords = await conn.getRecords({
        filters: [{ source }],
        returnProperties: ['@rid', 'sourceId'],
        target: 'Statement',
    });

    const existingIds = new Set(existingRecords.map(r => r.sourceId));

    for (const summaryRecord of recordsList) {
        try {
            checkSpec(variantSummarySpec, summaryRecord);
        } catch (err) {
            logger.error(err);
            counts.error++;
            errorList.push({ error: err, isSummary: true, summaryRecord });
            continue;
        }

        if (existingIds.has(summaryRecord.hgvs.toLowerCase())) {
            counts.existing++;
            continue;
        }
        logger.info(`loading: ${BASE_URL}/${summaryRecord.hgvs}.json`);
        const record = await request({
            json: true,
            method: 'GET',
            uri: `${BASE_URL}/${summaryRecord.hgvs}.json`,
        });

        filtered.push(record);

        for (const diseaseRec of record.diseases) {
            if (diseaseRec.source_pubmed_id) {
                pmidList.push(`${diseaseRec.source_pubmed_id}`);
            }
        }
    }
    logger.info(`loading ${pmidList.length} pubmed articles`);
    await _pubmed.fetchAndLoadByIds(conn, pmidList);
    logger.info(`processing ${filtered.length} remaining docm records`);

    for (let index = 0; index < filtered.length; index++) {
        const record = filtered[index];
        logger.info(`(${index} / ${filtered.length}) ${record.hgvs}`);

        try {
            checkSpec(recordSpec, record);
            // replace - as empty
            record.reference = record.reference.replace('-', '');
            record.variant = record.variant.replace('-', '');
            const updates = await processRecord({
                conn, record, source,
            });
            counts.success += updates.success;
            counts.error += updates.error;
            counts.skip += updates.skip;
        } catch (err) {
            errorList.push({ error: err, record });
            counts.error++;
            logger.error((err.error || err).message);
        }
    }
    logger.info(JSON.stringify(counts));
    const errorsJSON = `${errorLogPrefix}-docm.json`;
    logger.info(`writing: ${errorsJSON}`);
    fs.writeFileSync(errorsJSON, JSON.stringify({ records: errorList }, null, 2));
};

module.exports = {
    SOURCE_DEFN, specs: { recordSpec, variantSummarySpec }, upload,
};
