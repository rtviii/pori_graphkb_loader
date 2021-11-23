const { fetchAndLoadById }   = require('./../../pori_graphkb_loader/src/ensembl/index')
const { ApiConnection, rid } = require('./../../pori_graphkb_loader/src/graphkb')


test('Placeholder', () => {expect(false).toBe(!true)});


/**
 * 
 *  @todo the protein is loaded both versioned and unversioned
 *  @todo unversioned protein    is linked to the versioned    protein via            GeneralizationOf edge
 *  @todo unversioned protein    is linked to the unversioned  transcript         via ElementOf        edge
 *  @todo unversioned transcript is linked to the unversioned  gene               via ElementOf        edge
 */

let apiConn; 
let KRAS = []

beforeAll(() => {
    apiConn =  new ApiConnection('http://0.0.0.0:8080/api')
    apiConn.password = process.env.GKB_API_PASSWORD
    apiConn.username = process.env.GKB_API_USER

  KRAS = [

    {
      sourceIdVersion: '',
      sourceId       : 'ENSG00000133703',
      biotype        : 'gene'
    },
    {
      sourceIdVersion: "",
      sourceId       : 'ENST00000311936.8',
      biotype        : 'transcript'
    },
    {
      sourceIdVersion: '',
      sourceId       : 'ENST00000256078.10',
      biotype        : 'transcript'
    },
    {
      sourceIdVersion: '',
      sourceId       : 'ENST00000556131.1',
      biotype        : 'transcript'
    },
    {
      sourceIdVersion: '',
      sourceId       : 'ENST00000557334.5',
      biotype        : 'transcript'
    }
  ]

});


test('Upload KRAS gene', async() => {

// Uploaded KRAS gene
    await fetchAndLoadById(apiConn, KRAS[0])                
    const fetched_gene = await apiConn.getUniqueRecordBy({
        filters  : [
            { sourceId       : KRAS[0]['sourceId'       ].split('.')[0] },
            { sourceIdVersion: KRAS[0]['sourceIdVersion']},
            { biotype        : KRAS[0]['biotype'        ] },
        ],
        target: 'Feature',
    }) 
    expect(fetched_gene).toHaveProperty('sourceId', 'ensg00000133703')
    expect(fetched_gene).toHaveProperty('sourceIdVersion', '')
    expect(fetched_gene).toHaveProperty('biotype', 'gene')

    


});



test("Upload KRAS transcripts", async()=>{

    // upload KRAS-related transcripts
    for (var t of KRAS.slice(1,4)){
     await fetchAndLoadById(apiConn, t) 
    }

    const fetched_transcript = await apiConn.getUniqueRecordBy({
    neighbors: 2,
    filters  : [
        { sourceId       : KRAS[1]['sourceId'       ].split('.')[0] },
        { sourceIdVersion: KRAS[1]['sourceId'].split('.')[1] },
        { biotype        : KRAS[1]['biotype'        ] },
    ],
    target: 'Feature',
    }) 
    expect(fetched_transcript).toHaveProperty('sourceId', 'enst00000311936')
    expect(fetched_transcript).toHaveProperty('sourceIdVersion', '8')
    expect(fetched_transcript).toHaveProperty('biotype', 'transcript')

})


test("Upload KRAS protein", async()=>{

    // upload *some* protein
    await fetchAndLoadById(apiConn, {
    sourceIdVersion: '', // 5
    sourceId       : 'np_001309769',
    biotype        : 'protein'
    }).catch(e => console.log("Protein upload errored out:", e))


    const protein = await apiConn.getRecords({
    // neighbors: 2,
    filters  : [
        { sourceId       : "np_001309769"},
        { biotype        : 'protein' },
    ],
        target: 'Feature',
    }) 

    console.log(protein)
    expect(protein[0]).toHaveProperty('sourceId', 'np_001309769')
    expect(protein[0]).toHaveProperty('sourceIdVersion', null)

})