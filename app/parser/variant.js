'use strict';
/** @module app/parser/variant */
const nRegex = require('named-js-regexp');
const {ParsingError} = require('./../repo/error');
const {parsePosition, breakRepr} = require('./position');

const EVENT_SUBTYPE = {
    INS: 'insertion',
    DEL: 'deletion',
    SUB: 'substitution',
    INV: 'inversion',
    INDEL: 'indel',
    GAIN: 'gain',
    LOSS: 'loss',
    TRANS: 'translocation',
    ITRANS: 'inverted translocation',
    EXT: 'extension',
    FS: 'frameshift',
    FUSION: 'fusion',
    DUP: 'duplication',
    ME: 'methylation',
    AC: 'acetylation',
    UB: 'ubiquitination',
    SPL: 'splice-site'
};


const NOTATION_TO_SUBTYPE = new Map([
    ['fs', EVENT_SUBTYPE.FS],
    ['>', EVENT_SUBTYPE.SUB],
    ['delins', EVENT_SUBTYPE.INDEL],
    ['inv', EVENT_SUBTYPE.INV],
    ['ext', EVENT_SUBTYPE.EXT],
    ['del', EVENT_SUBTYPE.DEL],
    ['dup', EVENT_SUBTYPE.DUP],
    ['ins', EVENT_SUBTYPE.INS],
    ['copygain', EVENT_SUBTYPE.GAIN],
    ['copyloss', EVENT_SUBTYPE.LOSS],
    ['trans', EVENT_SUBTYPE.TRANS],
    ['itrans', EVENT_SUBTYPE.ITRANS],
    ['spl', EVENT_SUBTYPE.SPL],
    ['fusion', EVENT_SUBTYPE.FUSION]
]);

/**
 * Given a string, check that it contains a valid prefix
 *
 * @param {string} string
 *
 * @returns {string} the prefix
 */
const getPrefix = (string) => {
    const prefix = string[0];
    const expectedPrefix = ['g', 'c', 'e', 'y', 'p'];
    if (! expectedPrefix.includes(prefix)) {
        throw new ParsingError({
            message: `'${prefix}' is not an accepted prefix`,
            expected: expectedPrefix,
            input: string
        });
    }
    if (string.length < 2 || string[1] != '.') {
        throw new ParsingError({
            message: 'Missing \'.\' separator after prefix',
            input: string
        });
    }
    return prefix;
};

/**
 * Parse variant shorthand. Checks and validates notation
 *
 * @param {string} string the variant to be parsed
 *
 * @returns {object} the parsed content
 */
const parse = (string) => {
    if (! string || string.length < 4) {
        throw new ParsingError({
            message: 'Too short. Must be a minimum of four characters',
            input: string
        });
    }
    let split = string.split(':');
    if (split.length > 2) {
        throw new ParsingError({message: 'Variant notation must contain a single colon', input: string});
    } else if (split.length === 1) {
        split = [null, split[0]];
    }
    let result = {};
    const [featureString, variantString] = split;
    if (variantString.includes(',') || (featureString && (featureString.startsWith('(') || featureString.endsWith(')') || featureString.includes(',')))) {
        // multi-feature notation
        if (featureString) {
            if (featureString && ! featureString.includes(',')) {
                throw new ParsingError({
                    message: 'Multi-feature notation must contain two reference features separated by a comma',
                    parsed: {featureString, variantString},
                    input: string
                });
            } else if (! featureString.startsWith('(')) {
                throw new ParsingError({
                    message: 'Missing opening parentheses surrounding the reference features',
                    parsed: {featureString, variantString},
                    input: string
                });
            } else if (! featureString.endsWith(')')) {
                throw new ParsingError({
                    message: 'Missing closing parentheses surrounding the reference features',
                    parsed: {featureString, variantString},
                    input: string
                });
            }
            let features = featureString.slice(1, featureString.length - 1).split(',');
            if (features.length > 2) {
                throw new ParsingError({
                    message: 'May only specify two features. Found more than a single comma',
                    parsed: {featureString, variantString},
                    input: string
                });
            }
            result.reference1 = features[0];
            result.reference2 = features[1];
        }
        try {
            const variant = parseMultiFeature(variantString);
            result = Object.assign(result, variant);
        } catch (err) {
            throw new ParsingError({
                message: 'Error in parsing the variant',
                parsed: Object.assign({variantString}, result),
                input: string,
                subParserError: err
            });
        }
    } else {
        // continuous notation
        if (featureString) {
            result.reference1 = featureString;
        }
        try {
            const variant = parseContinuous(variantString);
            Object.assign(result, variant);
        } catch (err) {
            throw new ParsingError({
                message: 'Error in parsing the continuous variant',
                parsed: Object.assign({variantString}, result),
                input: string,
                subParserError: err
            });
        }
    }
    delete result.prefix; // only kept until now to make debugging easier when an error is thrown
    return result;
};

/**
 * Given a string representing a multi-feature variant. Parse and checks the format returning meaningful
 * error messages.
 *
 * @param {string} string the string to be parsed
 *
 * @returns {pbject} the parsed variant information
 *
 * @example
 * > parseMultiFeature('e.fusion(1,10)');
 * {type: 'fusion', prefix: 'e', break1Start: {'@class': 'ExonicPosition', pos: 1}, break1Repr: 'e.1', break2Start: {'@class': 'ExonicPosition', pos: 10}, break2Repr: 'e.10}
 */
const parseMultiFeature = (string) => {
    if (string.length < 6) {
        throw new ParsingError(`Too short. Multi-feature notation must be a minimum of six characters: ${string}`);
    }
    const parsed = {};
    /*try {
        parsed.prefix = getPrefix(string);
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the prefix',
            input: string,
            subParserError: err
        });
    }*/

    if (string.indexOf('(') < 0) {
        throw new ParsingError({message: 'Missing opening parentheses', input: string});
    }
    parsed.type = string.slice(0, string.indexOf('('));
    if (parsed.type.length === 0) {
        throw new ParsingError({
            message: 'Variant type was not specified. It is expected to immediately follow the coordinate prefix',
            parsed,
            input: string
        });
    }
    if (! NOTATION_TO_SUBTYPE.has(parsed.type)) {
        throw new ParsingError({message: 'Variant type not recognized', parsed, input: string});
    }
    if (! ['fusion', 'trans', 'itrans'].includes(parsed.type)) {
        throw new ParsingError({
            message: `Continuous notation is preferred over multi-feature notation for ${parsed.type} variant types`,
            parsed, input: string
        });
    }
    parsed.type = NOTATION_TO_SUBTYPE.get(parsed.type);
    if (string.indexOf(')') < 0) {
        throw new ParsingError({message: 'Missing closing parentheses', parsed, input: string});
    }
    const untemplatedSeq = string.slice(string.indexOf(')') + 1);
    if (untemplatedSeq.length > 0) {
        if (parseInt(untemplatedSeq)) {
            parsed.untemplatedSeqSize = parseInt(untemplatedSeq);
        } else {
            parsed.untemplatedSeq = untemplatedSeq;
            parsed.untemplatedSeqSize = untemplatedSeq.length;
        }
    }
    const positions = string.slice(string.indexOf('(') + 1, string.indexOf(')')).split(',');
    if (positions.length > 2) {
        throw new ParsingError({message: 'Single comma expected to split breakpoints/ranges', parsed, input: string});
    } else if (positions.length < 2) {
        throw new ParsingError({message: 'Missing comma separator between breakpoints/ranges', parsed, input: string});
    }
    let prefix;
    try {
        prefix = getPrefix(positions[0]);
        positions[0] = positions[0].slice(2);
        if (positions[0].includes('_')) {
            const splitPos = positions[0].indexOf('_');
            parsed.break1Start = parsePosition(prefix, positions[0].slice(0, splitPos));
            parsed.break1End = parsePosition(prefix, positions[0].slice(splitPos + 1));
        } else {
            parsed.break1Start = parsePosition(prefix, positions[0]);
        }
        parsed.break1Repr = breakRepr(prefix, parsed.break1Start, parsed.break1End);
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the first breakpoint position/range',
            input: string, parsed, subParserError: err
        });
    }
    try {
        prefix = getPrefix(positions[1]);
        positions[1] = positions[1].slice(2);
        if (positions[1].includes('_')) {
            const splitPos = positions[1].indexOf('_');
            parsed.break2Start = parsePosition(prefix, positions[1].slice(0, splitPos));
            parsed.break2End = parsePosition(prefix, positions[1].slice(splitPos + 1));
        } else {
            parsed.break2Start = parsePosition(prefix, positions[1]);
        }
        parsed.break2Repr = breakRepr(prefix, parsed.break2Start, parsed.break2End);
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the second breakpoint position/range',
            input: string, parsed, subParserError: err
        });
    }
    return parsed;
};

/**
 * Given a string representing a continuous variant, parses and checks the content
 *
 * @param {string} string the variant to be parsed
 *
 * @returns {object} the parsed content
 *
 * @example
 * > parseContinuous('p.G12D')
 * {type: 'substitution', prefix: 'p', break1Start: {'@class': 'ProteinPosition', pos: 12, refAA: 'G'}, untemplatedSeq: 'D'}
 */
const parseContinuous = (string) => {
    if (string.length < 3) {
        throw new ParsingError(`Too short. Must be a minimum of three characters: ${string}`);
    }

    const prefix = getPrefix(string);
    const p = '([A-Z0-9\\*\\?\\+\\-]*[0-9\\?]|[pq][0-9\\.\?]*)';
    let regex = nRegex(
        `^(?<break1>${p}|(\\(${p}_${p}\\)))`
        + `(_(?<break2>${p}|(\\(${p}_${p}\\))))?`
        + '(?<tail>[^_\\(\\)]+)$'
    );
    let match = regex.exec(string.slice(prefix.length + 1));
    if (match === null) {
        throw new ParsingError(`Input string did not match the expected pattern: ${string}`);
    }

    let m;
    const result = {prefix: prefix};
    try {
        if (m = /\(([^_]+)_([^_]+)\)/.exec(match.group('break1'))) {
            result.break1Start = parsePosition(prefix, m[1]);
            result.break1End =  parsePosition(prefix, m[2]);
        } else {
            result.break1Start = parsePosition(prefix, match.group('break1'));
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the first breakpoint position/range',
            input: string,
            parsed: result,
            subParserError: err
        });
    }
    try {
        if (match.group('break2') !== undefined) {
            if (m = /\(([^_]+)_([^_]+)\)/.exec(match.group('break2'))) {
                result.break2Start = parsePosition(prefix, m[1]);
                result.break2End = parsePosition(prefix, m[2]);
            } else {
                result.break2Start = parsePosition(prefix, match.group('break2'));
            }
        }
    } catch (err) {
        throw new ParsingError({
            message: 'Error in parsing the second breakpoint position/range',
            input: string,
            parsed: result,
            subParserError: err
        });
    }

    const tail = match.group('tail');
    result.break1Repr = breakRepr(prefix, result.break1Start, result.break1End);
    if (result.break2Start) {
        result.break2Repr = breakRepr(prefix, result.break2Start, result.break2End);
    }

    if (match = /^del([A-Z\?\*]+)?ins([A-Z\?\*]+|\d+)?$/.exec(tail)) {  // indel
        result.type = 'delins';
        if (match[1]) {
            result.refSeq = match[1];
        }
        if (parseInt(match[2])) {
            result.untemplatedSeqSize = parseInt(match[2]);
        } else if (match[2] && match[2] !== '?') {
            result.untemplatedSeq = match[2];
        }
    } else if (match = /^(del|inv|ins|dup)([A-Z\?\*]+|\d+)?$/.exec(tail)) {  // deletion
        result.type = match[1];
        if (parseInt(match[2])) {
            if (result.type === 'ins' || result.type === 'dup') {
                result.untemplatedSeqSize = parseInt(match[2]);
            }
        } else if (match[2] && match[2] !== '?') {
            if (result.type === 'dup') {
                result.untemplatedSeq = match[2];
                result.refSeq = match[2];
            } else if (result.type === 'ins') {
                result.untemplatedSeq = match[2];
            } else {
                result.refSeq = match[2];
            }
        }
    } else if (match = /^[A-Z\?\*]$/.exec(tail)) {
        if (prefix !== 'p') {
            throw new ParsingError('only protein notation does not use ">" for a substitution');
        }
        result.type = '>';
        result.untemplatedSeq = tail;
    } else if (match = /^([A-Z\?])>([A-Z\?])$/.exec(tail)) {
        if (prefix === 'p') {
            throw new ParsingError('protein notation does not use ">" for a substitution');
        } else if (prefix === 'e') {
            throw new ParsingError('Cannot defined substitutions at the exon coordinate level');
        }
        result.type = '>';
        result.refSeq = match[1];
        result.untemplatedSeq = match[2];
    } else if (match = /^([A-Z\?])?fs(\*(\d+))?$/.exec(tail)) {
        if (prefix !== 'p') {
            throw new ParsingError('only protein notation can notate frameshift variants');
        }
        result.type = 'fs';
        if (match[1] !== undefined && match[1] !== '?') {
            result.untemplatedSeq = match[1];
        }
        if (match[3] !== undefined) {
            result.truncation = parseInt(match[3]);
        }
    } else if (tail == 'spl'){
        result.type = 'spl';
    } else {
        result.type = tail;
    }
    if (! NOTATION_TO_SUBTYPE.has(result.type)) {
        throw new ParsingError(`unsupported event type: ${result.type}`);
    }
    result.type = NOTATION_TO_SUBTYPE.get(result.type);
    if (result.untemplatedSeq && result.untemplatedSeqSize === undefined) {
        result.untemplatedSeqSize = result.untemplatedSeq.length;
    }
    // check for innapropriate types
    if (prefix === 'y') {
        if (result.refSeq || result.untemplatedSeq) {
            throw new ParsingError('cannot define sequence elements at the cytoband level');
        } else if (! [EVENT_SUBTYPE.DUP, EVENT_SUBTYPE.DEL, EVENT_SUBTYPE.GAIN, EVENT_SUBTYPE.LOSS, EVENT_SUBTYPE.INV].includes(result.type)) {
            throw new ParsingError({
                message: 'Invalid type for cytoband level event notation',
                parsed: result
            });
        }
    } else if (prefix === 'e') {
        if (result.refSeq || result.untemplatedSeq) {
            throw new ParsingError('cannot define sequence elements at the exon level');
        } else if (! [EVENT_SUBTYPE.DUP, EVENT_SUBTYPE.DEL].includes(result.type)) {
            throw new ParsingError({
                message: 'only duplication and deletion events can be declared at the exon level',
                parsed: result
            });
        }
    }
    // special case refSeq protein substitutions
    if (prefix === 'p' && ! result.break1End && ! result.break2Start && ! result.break2End && result.break1Start.refAA) {
        result.refSeq = result.break1Start.refAA;
    }
    return result;
};


module.exports = {parse, NOTATION_TO_SUBTYPE, EVENT_SUBTYPE, parseContinuous, parseMultiFeature};
