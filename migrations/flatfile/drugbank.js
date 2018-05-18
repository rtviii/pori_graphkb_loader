/**
 * Module to load the DrugBank data from the XML download
 *
 * Example record
{ '$': { type: 'biotech', created: '2005-06-13', updated: '2018-03-02' },
  'drugbank-id': [ { _: 'DB00001', '$': [Object] }, 'BTD00024', 'BIOD00024' ],
  name: [ 'Lepirudin' ],
  description:
   [ 'Lepirudin is identical to natural hirudin except for substitution of leucine for isoleucine at the N-terminal end of the molecule and the absence of a sulfate group on the tyrosine at position 63. It is produced via yeast cells. Bayer ceased the production of lepirudin (Refludan) effective May 31, 2012.' ],
  'cas-number': [ '138068-37-8' ],
  unii: [ 'Y43GF64R34' ],
  state: [ 'liquid' ],
  groups: [ { group: [Array] } ],
  'general-references': [ { articles: [Array], textbooks: [Array], links: [Array] } ],
  'synthesis-reference': [ '' ],
  indication: [ 'For the treatment of heparin-induced thrombocytopenia' ],
  pharmacodynamics:
   [ 'Lepirudin is used to break up clots and to reduce thrombocytopenia. It binds to thrombin and prevents thrombus or clot formation. It is a highly potent, selective, and essentially irreversible inhibitor of thrombin and clot-bond thrombin. Lepirudin requires no cofactor for its anticoagulant action. Lepirudin is a recombinant form of hirudin, an endogenous anticoagulant found in medicinal leeches.' ],
  'mechanism-of-action':
   [ 'Lepirudin forms a stable non-covalent complex with alpha-thrombin, thereby abolishing its ability to cleave fibrinogen and initiate the clotting cascade. The inhibition of thrombin prevents the blood clotting cascade. ' ],
  toxicity:
   [ 'In case of overdose (eg, suggested by excessively high aPTT values) the risk of bleeding is increased.' ],
  metabolism:
   [ 'Lepirudin is thought to be metabolized by release of amino acids via catabolic hydrolysis of the parent drug. However, con-clusive data are not available. About 48% of the administration dose is excreted in the urine which consists of unchanged drug (35%) and other fragments of the parent drug.' ],
  absorption: [ 'Bioavailability is 100% following injection.' ],
  'half-life': [ 'Approximately 1.3 hours' ],
  'protein-binding': [ '' ],
  'route-of-elimination':
   [ 'Lepirudin is thought to be metabolized by release of amino acids via catabolic hydrolysis of the parent drug. About 48% of the administration dose is excreted in the urine which consists of unchanged drug (35%) and other fragments of the parent drug.' ],
  'volume-of-distribution':
   [ '* 12.2 L [Healthy young subjects (n = 18, age 18-60 years)]\r\n* 18.7 L [Healthy elderly subjects (n = 10, age 65-80 years)]\r\n* 18 L [Renally impaired patients (n = 16, creatinine clearance below 80 mL/min)]\r\n* 32.1 L [HIT patients (n = 73)]' ],
  clearance:
   [ '* 164 ml/min [Healthy 18-60 yrs]\r\n* 139 ml/min [Healthy 65-80 yrs]\r\n* 61 ml/min [renal impaired]\r\n* 114 ml/min [HIT (Heparin-induced thrombocytopenia)]' ],
  classification:
   [ { description: [Array],
       'direct-parent': [Array],
       kingdom: [Array],
       superclass: [Array],
       class: [Array],
       subclass: [Array] } ],
  salts: [ '' ],
  synonyms: [ { synonym: [Array] } ],
  products: [ { product: [Array] } ],
  'international-brands': [ '' ],
  mixtures: [ { mixture: [Array] } ],
  packagers: [ { packager: [Array] } ],
  manufacturers: [ { manufacturer: [Array] } ],
  prices: [ { price: [Array] } ],
  categories: [ { category: [Array] } ],
  'affected-organisms': [ { 'affected-organism': [Array] } ],
  dosages: [ { dosage: [Array] } ],
  'atc-codes': [ { 'atc-code': [Array] } ],
  'ahfs-codes': [ '' ],
  'pdb-entries': [ '' ],
  'fda-label':
   [ '//s3-us-west-2.amazonaws.com/drugbank/fda_labels/DB00001.pdf?1265924858' ],
  msds:
   [ '//s3-us-west-2.amazonaws.com/drugbank/msds/DB00001.pdf?1368416245' ],
  patents: [ { patent: [Array] } ],
  'food-interactions': [ '' ],
  'drug-interactions': [ { 'drug-interaction': [Array] } ],
  sequences: [ { sequence: [Array] } ],
  'experimental-properties': [ { property: [Array] } ],
  'external-identifiers': [ { 'external-identifier': [Array] } ],
  'external-links': [ { 'external-link': [Array] } ],
  pathways: [ { pathway: [Array] } ],
  reactions: [ '' ],
  'snp-effects': [ '' ],
  'snp-adverse-drug-reactions': [ '' ],
  targets: [ { target: [Array] } ],
  enzymes: [ '' ],
  carriers: [ '' ],
  transporters: [ '' ] }
 */

const xml2js = require('xml2js');
const fs = require('fs');
const {addRecord} = require('./util');
const jsonfile = require('jsonfile');

/**
 * Promise wrapper around the xml to js parser so it will work with async instead of callback
 *
 * @param {string} xmlContent
 */
const parseXML = (xmlContent) => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlContent, (err, result) => {
            console.log(err);
            if (err !== null) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const uploadDrugBank = async ({filename, conn}) => {
    console.log(`reading: ${filename}`);
    const content = fs.readFileSync(filename).toString();
    console.log(`parsing: ${filename}`);
    const xml = await parseXML(content);
    console.log('uploading records');
    for (let drug of xml.drugbank.drug) {
        try {
            let body = {
                source: 'drugbank',
                sourceId: drug['drugbank-id'][0]['_'],
                name: drug.name[0],
                sourceIdVersion: drug['$'].updated,
                description: drug.description[0],
                mechanismOfAction: drug['mechanism-of-action'][0]
            };
            if (drug.categories[0] && drug.categories[0].category) {
                body.subsets = [];
                for (let cat of Object.values(drug.categories[0].category)) {
                    body.subsets.push(cat.category[0]);
                }
            }
            await addRecord('therapies', body, conn, true);
        } catch (err) {
            console.log(err);
            console.log(drug);
            throw err;
        }
    }
    /*
    xml.drugbank.drug = xml.drugbank.drug.slice(0, 10);
    console.log('writing: drugbank.tmp.json');
    jsonfile.writeFileSync('drugbank.tmp.json', xml);*/
};

module.exports = {uploadDrugBank};