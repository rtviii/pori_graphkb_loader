# Entrez API

These modules load records by ID from the Entrez REST APIs. We try to keep a common format for the functions for each module

## fetchAndLoadByIds

Fetch records from the particular DB by their ID. Load these into GraphKB and return the newly created GraphKB records

### Get a List of Pubmed Articles

```js
const articles = await fetchAndLoadByIds(graphkbConn, [1234, 12345]);
```

## fetchAndLoadBySearchTerm

Fetch records based on a search term rather than their ID. For example you may want to fetch an entrez gene by its gene symbol instead of its ID if they ID was not given by the source you are loading.

## preLoadCache

This function is used to load the previously loaded itesm from GraphKB to avoid making unecessary requests to the entrez APIs. It is only more efficient if you are planning to load a very large number of records from entrez.
