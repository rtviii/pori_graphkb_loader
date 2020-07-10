/**
 * @module importer/civic
 */
const request = require('request-promise');
const _ = require('lodash');
const Ajv = require('ajv');
const fs = require('fs');

const { checkSpec } = require('../../util');
const {
    orderPreferredOntologyTerms,
    rid,
} = require('../../graphkb');
const { logger } = require('../../logging');
const _pubmed = require('../../entrez/pubmed');
const _entrezGene = require('../../entrez/gene');
const { civic: SOURCE_DEFN, ncit: NCIT_SOURCE_DEFN } = require('../../sources');
const { downloadVariantRecords, processVariantRecord } = require('./variant');

const ajv = new Ajv();


const TRUSTED_CURATOR_ID = 968;

const BASE_URL = 'https://civicdb.org/api';

/**
 * https://civicdb.org/glossary
 */
const VOCAB = {
    1: 'Evidence likely does not belong in CIViC. Claim is not supported well by experimental evidence. Results are not reproducible, or have very small sample size. No follow-up is done to validate novel claims.',
    2: 'Evidence is not well supported by experimental data, and little follow-up data is available. Publication is from a journal with low academic impact. Experiments may lack proper controls, have small sample size, or are not statistically convincing.',
    3: 'Evidence is convincing, but not supported by a breadth of experiments. May be smaller scale projects, or novel results without many follow-up experiments. Discrepancies from expected results are explained and not concerning.',
    4: 'Strong, well supported evidence. Experiments are well controlled, and results are convincing. Any discrepancies from expected results are well-explained and not concerning.',
    5: 'Strong, well supported evidence from a lab or journal with respected academic standing. Experiments are well controlled, and results are clean and reproducible across multiple replicates. Evidence confirmed using separate methods.',
    A: 'Trusted association in clinical medicine that routinely informs treatment, including large scale metaanalyses, standard of care associations, and organizational recommendations.',
    B: 'Clinical evidence from clinical trials and other primary tumor data.',
    C: 'Case study evidence from individual case reports in peer reviewed journals.',
    D: 'Preclinical evidence from cell line studies, mouse models, and other in vitro or in vivo models.',
    E: 'Inferential association made from experimental data.',
    url: 'https://civicdb.org/glossary',
};

const EVIDENCE_LEVEL_CACHE = {}; // avoid unecessary requests by caching the evidence levels
const RELEVANCE_CACHE = {};


const validateEvidenceSpec = ajv.compile({
    properties: {
        clinical_significance: {
            enum: [
                'Sensitivity',
                'Adverse Response',
                'Resistance',
                'Sensitivity/Response',
                'Reduced Sensitivity',
                'Positive',
                'Negative',
                'Poor Outcome',
                'Better Outcome',
                'Uncertain Significance',
                'Pathogenic',
                'Likely Pathogenic',
                'N/A',
                'Gain of Function',
                'Loss of Function',
                'Neomorphic',
                'Dominant Negative',
                null,
            ],
        },
        description: { type: 'string' },
        disease: {
            doid: { type: 'string' },
            name: { type: 'string' },
            type: 'object',
        },
        drug_interaction_type: { enum: ['Combination', 'Substitutes', 'Sequential', null] },
        drugs: {
            items: {
                properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                    ncit_id: { type: ['string', 'null'] },
                    pubchem_id: { type: ['string', 'null'] },
                },
                required: ['name', 'ncit_id'],
                type: 'object',
            },
            type: 'array',
        },
        evidence_direction: { enum: ['Supports', 'N/A', 'Does Not Support', null] },
        evidence_level: { type: 'string' },
        evidence_type: {
            enum: ['Predictive', 'Diagnostic', 'Prognostic', 'Predisposing', 'Functional'],
        },
        id: { type: 'number' },
        rating: { type: ['number', 'null'] },
        source: {
            properties: {
                citation_id: { type: 'string' },
                name: { type: ['string', 'null'] },
                source_type: { type: 'string' },
            },
        },
        status: { type: 'string' },
        variant_id: { type: 'number' },
    },
    type: 'object',
});


/**
 * Convert the CIViC relevance types to GraphKB terms
 */
const getRelevance = async ({ rawRecord, conn }) => {
    const translateRelevance = ({ evidenceType, clinicalSignificance, evidenceDirection }) => {
        switch (evidenceType) { // eslint-disable-line default-case
            case 'Predictive': {
                switch (clinicalSignificance) { // eslint-disable-line default-case
                    case 'Sensitivity':
                    case 'Adverse Response':
                    case 'Reduced Sensitivity':

                    case 'Resistance': {
                        return clinicalSignificance.toLowerCase();
                    }

                    case 'Sensitivity/Response': { return 'sensitivity'; }
                }
                break;
            }

            case 'Functional': {
                return clinicalSignificance.toLowerCase();
            }

            case 'Diagnostic': {
                switch (clinicalSignificance) { // eslint-disable-line default-case
                    case 'Positive': { return 'favours diagnosis'; }

                    case 'Negative': { return 'opposes diagnosis'; }
                }
                break;
            }

            case 'Prognostic': {
                switch (clinicalSignificance) { // eslint-disable-line default-case
                    case 'Negative':

                    case 'Poor Outcome': {
                        return 'unfavourable prognosis';
                    }
                    case 'Positive':

                    case 'Better Outcome': {
                        return 'favourable prognosis';
                    }
                }
                break;
            }

            case 'Predisposing': {
                if (['Positive', null, 'null'].includes(clinicalSignificance)) {
                    return 'Predisposing';
                } if (clinicalSignificance.includes('Pathogenic')) {
                    return clinicalSignificance;
                } if (clinicalSignificance === 'Uncertain Significance') {
                    return 'likely predisposing';
                }
                break;
            }
        }

        throw new Error(
            `unable to process relevance (${JSON.stringify({ clinicalSignificance, evidenceDirection, evidenceType })})`,
        );
    };

    // translate the type to a GraphKB vocabulary term
    let relevance = translateRelevance({
        clinicalSignificance: rawRecord.clinical_significance,
        evidenceDirection: rawRecord.evidence_direction,
        evidenceType: rawRecord.evidence_type,
    }).toLowerCase();

    if (RELEVANCE_CACHE[relevance] === undefined) {
        relevance = await conn.getVocabularyTerm(relevance);
        RELEVANCE_CACHE[relevance.name] = relevance;
    } else {
        relevance = RELEVANCE_CACHE[relevance];
    }
    return relevance;
};

/**
 * Given some drug name, find the drug that is equivalent by name in GraphKB
 */
const getDrug = async (conn, drugRecord) => {
    let originalError;

    // fetch from NCIt first if possible, or pubchem
    // then use the name as a fallback
    const name = drugRecord.name.toLowerCase().trim();

    if (drugRecord.ncit_id) {
        try {
            const drug = await conn.getUniqueRecordBy({
                filters: [
                    { source: { filters: { name: NCIT_SOURCE_DEFN.name }, target: 'Source' } },
                    { sourceId: drugRecord.ncit_id },
                    { name: drugRecord.name },
                ],
                sort: orderPreferredOntologyTerms,
                target: 'Therapy',
            });
            return drug;
        } catch (err) {
            logger.error(`had NCIt drug mapping (${drugRecord.ncit_id}) named (${drugRecord.name}) but failed to fetch from graphkb: ${err}`);
            throw err;
        }
    }

    try {
        const drug = await conn.getTherapy(name);
        return drug;
    } catch (err) {
        originalError = err;
    }

    try {
        const match = /^\s*(\S+)\s*\([^)]+\)$/.exec(name);

        if (match) {
            return await conn.getTherapy(match[1]);
        }
    } catch (err) { }
    logger.error(originalError);
    throw originalError;
};


/** *
 * Add or fetch an drug combination if there is not an existing record
 * Link the drug combination to its individual elements
 */
const addOrFetchDrug = async (conn, source, drugsRecords, combinationType) => {
    if (drugsRecords.length <= 1) {
        if (drugsRecords[0] === null) {
            return null;
        }
        return getDrug(conn, drugsRecords[0]);
    }
    const drugs = await Promise.all(drugsRecords.map(async drug => getDrug(conn, drug)));
    const sourceId = drugs.map(e => e.sourceId).sort().join(' + ');
    const name = drugs.map(e => e.name).sort().join(' + ');
    const combinedTherapy = await conn.addRecord({
        content: {
            combinationType, name, source: rid(source), sourceId,
        },
        existsOk: true,
        target: 'Therapy',
    });

    for (const drug of drugs) {
        await conn.addRecord({
            content: {
                in: rid(combinedTherapy), out: rid(drug), source: rid(source),
            },
            existsOk: true,
            target: 'ElementOf',
        });
    }
    return combinedTherapy;
};


const getEvidenceLevel = async ({
    conn, rawRecord, sources,
}) => {
    // get the evidenceLevel
    let level = `${rawRecord.evidence_level}${rawRecord.rating || ''}`.toLowerCase();

    if (EVIDENCE_LEVEL_CACHE[level] === undefined) {
        level = await conn.addRecord({
            content: {
                description: `${VOCAB[rawRecord.evidence_level]} ${VOCAB[rawRecord.rating] || ''}`,
                displayName: `${SOURCE_DEFN.displayName} ${level.toUpperCase()}`,
                name: level,
                source: rid(sources.civic),
                sourceId: level,
                url: VOCAB.url,
            },
            existsOk: true,
            fetchConditions: { AND: [{ sourceId: level }, { name: level }, { source: rid(sources.civic) }] },
            target: 'EvidenceLevel',

        });
        EVIDENCE_LEVEL_CACHE[level.sourceId] = level;
    } else {
        level = EVIDENCE_LEVEL_CACHE[level];
    }
    return level;
};


/**
 * Transform a CIViC evidence record into a GraphKB statement
 *
 * @param {object} opt
 * @param {ApiConnection} opt.conn the API connection object for GraphKB
 * @param {object} opt.rawRecord the unparsed record from CIViC
 * @param {object} opt.sources the sources by name
 * @param {object} opt.variantsCache keeps track of errors and results processing variants to avoid repeating
 * @param
 */
const processEvidenceRecord = async (opt) => {
    const {
        conn, rawRecord, sources, variantsCache,
    } = opt;

    const [level, relevance, [feature]] = await Promise.all([
        getEvidenceLevel(opt),
        getRelevance(opt),
        _entrezGene.fetchAndLoadByIds(conn, [rawRecord.variant.entrez_id]),
    ]);
    let variants;

    if (variantsCache.records[rawRecord.variant.id]) {
        variants = variantsCache.records[rawRecord.variant.id];
    } else if (variantsCache.errors[rawRecord.variant.id]) {
        throw variantsCache.errors[rawRecord.variant.id];
    } else {
        try {
            variants = await processVariantRecord(conn, rawRecord.variant, feature);
            variantsCache.records[rawRecord.variant.id] = variants;
            logger.info(`converted variant name (${rawRecord.variant.name}) to variants (${variants.map(v => v.displayName).join(', and ')})`);
        } catch (err) {
            variantsCache.errors[rawRecord.variant.id] = err;
            logger.error(`evidence (${rawRecord.id}) Unable to process the variant (id=${rawRecord.variant.id}, name=${rawRecord.variant.name}): ${err}`);
            throw err;
        }
    }
    // get the disease by doid
    let diseaseQueryFilters = {};

    if (rawRecord.disease.doid) {
        diseaseQueryFilters = {
            AND: [
                { sourceId: `doid:${rawRecord.disease.doid}` },
                { source: { filters: { name: 'disease ontology' }, target: 'Source' } },
            ],
        };
    } else {
        diseaseQueryFilters = { name: rawRecord.disease.name };
    }
    let disease;

    try {
        disease = await conn.getUniqueRecordBy({
            filters: diseaseQueryFilters,
            sort: orderPreferredOntologyTerms,
            target: 'Disease',
        });
    } catch (err) {
        throw err;
    }
    // get the drug(s) by name
    let drug;

    if (rawRecord.drugs) {
        drug = await addOrFetchDrug(
            conn,
            rid(sources.civic),
            rawRecord.drugs,
            (rawRecord.drug_interaction_type || '').toLowerCase(),
        );
    }
    // get the publication by pubmed ID
    let publication;

    try {
        [publication] = await _pubmed.fetchAndLoadByIds(conn, [rawRecord.source.citation_id]);
    } catch (err) {
        throw err;
    }

    // common content
    const content = {
        conditions: [...variants.map(v => rid(v))],
        description: rawRecord.description,
        evidence: [rid(publication)],
        evidenceLevel: rid(level),
        relevance: rid(relevance),
        reviewStatus: 'not required',
        source: rid(sources.civic),
        sourceId: rawRecord.id,
    };

    // create the statement and connecting edges
    if (rawRecord.evidence_type === 'Diagnostic' || rawRecord.evidence_type === 'Predisposing') {
        content.subject = rid(disease);
    } else {
        content.conditions.push(rid(disease));
    }

    if (rawRecord.evidence_type === 'Predictive' && drug) {
        content.subject = rid(drug);
    } if (rawRecord.evidence_type === 'Prognostic') {
        // get the patient vocabulary object
        content.subject = rid(await conn.getVocabularyTerm('patient'));
    } if (rawRecord.evidence_type === 'Functional') {
        content.subject = rid(feature);
    }

    if (content.subject && !content.conditions.includes(content.subject)) {
        content.conditions.push(content.subject);
    }

    if (!content.subject) {
        throw Error(`unable to determine statement subject for evidence (${content.sourceId}) record`);
    }
    await conn.addRecord({
        content,
        existsOk: true,
        fetchExisting: false,
        target: 'Statement',
    });
};


/**
 * Fetch civic approved evidence entries as well as those submitted by trusted curators
 *
 * @param {string} baseUrl the base url for the request
 */
const downloadEvidenceRecords = async (baseUrl) => {
    const urlTemplate = `${baseUrl}/evidence_items?count=500&status=accepted`;
    // load directly from their api
    const counts = { error: 0, skip: 0, success: 0 };
    let expectedPages = 1,
        currentPage = 1;

    const allRecords = [];
    const errorList = [];

    // get the aproved entries
    while (currentPage <= expectedPages) {
        const url = `${urlTemplate}&page=${currentPage}`;
        logger.info(`loading: ${url}`);
        const resp = await request({
            json: true,
            method: 'GET',
            uri: url,
        });
        expectedPages = resp._meta.total_pages;
        logger.info(`loaded ${resp.records.length} records`);
        allRecords.push(...resp.records);
        currentPage++;
    }

    // now find entries curated by trusted curators
    const { results: trustedSubmissions } = await request({
        body: {
            entity: 'evidence_items',
            operator: 'AND',
            queries: [{ condition: { name: 'is_equal_to', parameters: [`${TRUSTED_CURATOR_ID}`] }, field: 'submitter_id' }],
            save: true,
        },
        json: true,
        method: 'POST',
        uri: `${baseUrl}/evidence_items/search`,
    });

    let submitted = 0;

    for (const record of trustedSubmissions) {
        if (record.status === 'submitted') {
            submitted += 1;
            allRecords.push(record);
        }
    }
    logger.info(`loaded ${submitted} unaccepted entries from trusted submitters`);

    // validate the records using the spec
    const records = [];

    for (const record of allRecords) {
        try {
            checkSpec(validateEvidenceSpec, record);
        } catch (err) {
            errorList.push({ error: err, errorMessage: err.toString(), record });
            logger.error(err);
            counts.error++;
            continue;
        }

        if (
            record.clinical_significance === 'N/A'
            || record.evidence_direction === 'Does Not Support'
            || (record.clinical_significance === null && record.evidence_type === 'Predictive')
        ) {
            counts.skip++;
            logger.debug(`skipping uninformative record (${record.id})`);
        } else if (record.source.source_type.toLowerCase() !== 'pubmed') {
            logger.info(`Currently only loading pubmed sources. Found ${record.source.source_type} (${record.id})`);
            counts.skip++;
        } else {
            records.push(record);
        }
    }
    return { counts, errorList, records };
};


/**
 * Access the CIVic API, parse content, transform and load into GraphKB
 *
 * @param {object} opt options
 * @param {ApiConnection} opt.conn the api connection object for GraphKB
 * @param {string} [opt.url] url to use as the base for accessing the civic api
 */
const upload = async (opt) => {
    const { conn, errorLogPrefix } = opt;
    // add the source node
    const source = await conn.addRecord({
        content: SOURCE_DEFN,
        existsOk: true,
        fetchConditions: { name: SOURCE_DEFN.name },
        target: 'Source',
    });

    let previouslyEntered = await conn.getRecords({
        filters: { source: rid(source) },
        returnProperties: ['sourceId'],
        target: 'Statement',
    });
    previouslyEntered = new Set(previouslyEntered.map(r => r.sourceId));
    logger.info(`Found ${previouslyEntered.size} records previously added from ${SOURCE_DEFN.name}`);
    logger.info('caching publication records');
    _pubmed.preLoadCache(conn);

    const varById = await downloadVariantRecords();
    const { records, errorList, counts } = await downloadEvidenceRecords(opt.url || BASE_URL);


    logger.info(`Processing ${records.length} records`);

    // keep track of errors and already processed variants by their CIViC IDs to avoid repeat logging
    const variantsCache = {
        errors: {},
        records: {},
    };

    for (const record of records) {
        record.variants = [varById[record.variant_id]]; // OR-ing of variants

        if (record.drugs === undefined || record.drugs.length === 0) {
            record.drugs = [null];
        } else if (record.drug_interaction_type === 'Combination' || record.drug_interaction_type === 'Sequential') {
            record.drugs = [record.drugs];
        } else if (record.drug_interaction_type === 'Substitutes' || record.drugs.length < 2) {
            record.drugs = record.drugs.map(drug => [drug]);
            record.drug_interaction_type = null;
        } else {
            logger.error(`(evidence: ${record.id}) unsupported drug interaction type (${record.drug_interaction_type}) for a multiple drug (${record.drugs.length}) statement`);
            counts.skip++;
            continue;
        }

        let orCombination;

        if (orCombination = /^([a-z]\d+)([a-z])\/([a-z])$/i.exec(record.variants[0].name)) {
            const [, prefix, tail1, tail2] = orCombination;
            record.variants = [
                { ...record.variants[0], name: `${prefix}${tail1}` },
                { ...record.variants[0], name: `${prefix}${tail2}` },
            ];
        }

        for (const variant of record.variants) {
            for (const drugs of record.drugs) {
                try {
                    logger.debug(`processing ${record.id}`);
                    await processEvidenceRecord({
                        conn,
                        rawRecord: { ..._.omit(record, ['drugs', 'variants']), drugs, variant },
                        sources: { civic: source },
                        variantsCache,
                    });
                    counts.success += 1;
                } catch (err) {
                    if (err.toString().includes('is not a function') || err.toString().includes('of undefined')) {
                        console.error(err);
                    }
                    errorList.push({ error: err, errorMessage: err.toString(), record });
                    logger.error(`evidence (${record.id}) ${err}`);
                    counts.error += 1;
                }
            }
        }
    }
    logger.info(JSON.stringify(counts));
    const errorJson = `${errorLogPrefix}-civic.json`;
    logger.info(`writing ${errorJson}`);
    fs.writeFileSync(errorJson, JSON.stringify(errorList, null, 2));
};

module.exports = {
    SOURCE_DEFN,
    kb: true,
    specs: { validateEvidenceSpec },
    upload,
};