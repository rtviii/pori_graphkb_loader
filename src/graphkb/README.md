# GraphKB Module

The GraphKB loaders module contains helper functions for connecting to GraphKB and loading new
content into GraphKB. Some examples of the most commonly used functions are given below

## Get ID

The `rid` function fetches the record ID from a record object or returns the ID if the record is already an ID.

```js
const id = rid(record);
```

## Pick an Ontology Term

This function, `orderPreferredOntologyTerms`, can be used when your input source does not specify an ontology and several different ontology terms have been matched by name. There are a few key heuristics this follows

- non-deprecated terms are preferred over deprecated terms
- non-alias terms are preferred over alias/secondary terms
- for multiple versions of the same record, prefer the older/original version
- for different sources prefer the source with the lower "sort" value/rank. See `src/sources.js`.
- for otherwise equal records, prefer the one with more fields filled out

Since this method compares records it is most often used as a sorting method. For example here we have queried our instance of GraphKB and found that multiple records match the term "cancer". So we sort them using this function and pick the first one.

```js
const best = cancerTerms.sort(orderPreferredOntologyTerms)[0];
```

## Add a Variant

Variant records are indexed on a larger number of fields than other records so when you query to find the exact record of interest it is important to include nulls for the missing fields. To make this more convenient we have added a `addVariant` method to the `GraphKBConnection` class which handles this for you. This is simply a wrapper around the regular `addRecord` method and the same options that are used for that may be used here. For example

```js
conn.addVariant({target: 'PositionalVariant', content, existsOk: true});
```

## Add a Record

This method `addRecord` handles conflict errors should the record already exists and fetches the existing record or creates it if it does not exist.

For example to add a new disease term we will first need the link to the source that this record is from. For the example below we will assume it is "diease ontology" and we can find it via a query using the `getUniqueRecordBy` method which will throw an error if anything but a single record is found.

```js
const sourceRecord = await conn.getUniqueRecordBy({target: 'Source', filters: {name: 'disease ontology'}});
```

Now we are ready to add the new disease term. We must collect the data we will add as the content into an object.

```js
const content = {
    name: 'cancer',
    sourceId: 'doid:162',
    source: rid(sourceRecord),
    description: 'A disease of cellular proliferation that is malignant and primary, characterized by uncontrolled cellular proliferation, local cell invasion and metastasis.'
};
```

This is then passed to the `addRecord` function as `content`

```js
const cancer = await conn.addRecord({target: 'Disease', content});
```

As is this would throw an error if this term already exists. To tell the function that we don't care if it already exists and to just fetch it if it does we pass the `existsOk` option

```js
const cancer = await conn.addRecord({target: 'Disease', content, existsOk: true});
```

If we just want to create the record and we don't need to use it for anything after we can make this more efficient by telling the function not to bother fetching it if it exists

```js
await conn.addRecord({target: 'Disease', content, existsOk: true, fetchExisting: false});
```
