const HTTP_STATUS = require('http-status-codes');
const jc = require('json-cycle');
const _ = require('lodash');

const {ErrorMixin, AttributeError, NoRecordFoundError,  RecordExistsError} = require('./../repo/error');
const {select, create, update, remove, QUERY_LIMIT} = require('./../repo/base');
const {getParameterPrefix, looksLikeRID} = require('./../repo/util');


const MAX_JUMPS = 6;  // fetchplans beyond 6 are very slow

class InputValidationError extends ErrorMixin {}

/*
 * check that the parameters passed are expected
 */
const validateParams = async (opt) => {
    const required = opt.required || [];
    const optional = opt.optional || [];
    const allowNone = opt.allowNone !== undefined ? opt.allowNone : true;
    const params = [];

    for (let param of Array.from(opt.params) || []) {
        const {prefix} = getParameterPrefix(param);
        params.push(prefix ? prefix : param);
    }
    if (Object.keys(params).length == 0 && ! allowNone) {
        throw new InputValidationError('no parameters were specified');
    }
    // check that the required parameters are present
    for (let attr of required) {
        if (params.indexOf(attr) < 0) {
            throw new InputValidationError(`missing required parameter: ${attr}. Found ${params}`);
        }
    }
    // check that all parameters are expected
    for (let attr of params) {
        if (required.indexOf(attr) < 0 && optional.indexOf(attr) < 0) {
            throw new InputValidationError(`unexpected parameter: ${attr}`);
        }
    }
    return true;
};


/*
 * add basic CRUD methods for any standard db class
 *
 * can add get/post/delete methods to a router
 *
 * example:
 *      router.route('/feature') = resource({model: <ClassModel>, db: <OrientDB conn>, reqQueryParams: ['source', 'name', 'biotype']});
 */
const addResourceRoutes = (opt, verbose) => {
    const {router, model, db, cacheUpdate} = opt;
    const optQueryParams = opt.optQueryParams || _.concat(model._optional, model._required);
    const reqQueryParams = opt.reqQueryParams || [];
    verbose = opt.verbose || verbose;
    let route = opt.route || `/${model.name.toLowerCase()}${model.isEdge ? '' : 's'}`;
    if (route.endsWith('ys')) {
        route = route.replace(/ys$/, 'ies');
    }
    if (verbose) {
        console.log(`addResourceRoutes: ${route}`);
    }

    router.get(route,
        async (req, res) => {
            let fetchPlan = '*:1';
            console.log(req.query);
            if (req.query.neighbors !== undefined) {
                const neighbors = Number(req.query.neighbors);
                if (isNaN(neighbors) || neighbors < 0 || neighbors > MAX_JUMPS) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: `neighbors must be a number between 0 and ${MAX_JUMPS}`}));
                    return;
                }
                fetchPlan = `*:${neighbors}`;
                delete req.query.neighbors;
            }
            if (req.query.fuzzyMatch !== undefined) {
                const fuzzyMatch = Number(req.query.fuzzyMatch);
                if (isNaN(fuzzyMatch) || fuzzyMatch < 0 || fuzzyMatch > MAX_JUMPS) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: `fuzzyMatch must be a number between 0 and ${MAX_JUMPS}`}));
                    return;
                }
                req.query.fuzzyMatch = fuzzyMatch;
            }
            const params = _.omit(req.query, ['limit', 'fuzzyMatch', 'ancestors', 'descendants', 'returnProperties']);
            const other = Object.assign({limit: QUERY_LIMIT}, _.omit(req.query, Object.keys(params)));
            try {
                validateParams({params: params, required: reqQueryParams, optional: optQueryParams});
            } catch (err) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(err);
                return;
            }
            try {
                const result = await select(db, Object.assign(other, {model: model, where: req.query, fetchPlan: fetchPlan}));
                res.json(jc.decycle(result));
            } catch (err) {
                if (err instanceof AttributeError) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json(err);
                    return;
                }
                if (verbose) {
                    console.error(err);
                }
                res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
            }
        });
    router.post(route,
        async (req, res) => {
            if (! _.isEmpty(req.query)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: 'No query parameters are allowed for this query type', params: req.query}));
                return;
            }
            try {
                const result = await create(db, {model: model, content: req.body, user: req.user});
                if (cacheUpdate) {
                    await cacheUpdate(db);
                }
                res.json(jc.decycle(result));
            } catch (err) {
                if (err instanceof AttributeError) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json(err);
                } else if (err instanceof RecordExistsError) {
                    res.status(HTTP_STATUS.CONFLICT).json(err);
                } else {
                    if (verbose) {
                        console.error(err);
                    }
                    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
                }
            }
        }
    );

    // Add the id routes
    router.get(`${route}/:id`,
        async (req, res) => {
            let fetchPlan = '*:1';
            if (req.query.neighbors !== undefined) {
                const neighbors = Number(req.query.neighbors);
                if (isNaN(neighbors) || neighbors < 0 || neighbors > MAX_JUMPS) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: 'neighbors must be a number between 0 and 6'}));
                    return;
                }
                fetchPlan = `*:${neighbors}`;
                delete req.query.neighbors;
            }
            if (! looksLikeRID(req.params.id, false)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: `ID does not look like a valid record ID: ${req.params.id}`}));
                return;
            }
            req.params.id = `#${req.params.id.replace(/^#/, '')}`;
            if (! _.isEmpty(req.query)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: 'No query parameters are allowed for this query type', params: req.query}));
                return;
            }
            try {
                const result = await select(db, {model: model, where: {'@rid': req.params.id}, exactlyN: 1, fetchPlan: fetchPlan});
                res.json(jc.decycle(result[0]));
            } catch (err) {
                if (err instanceof NoRecordFoundError) {
                    res.status(HTTP_STATUS.NOT_FOUND).json(err);
                } else {
                    if (verbose) {
                        console.error(err);
                    }
                    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
                }
            }
        });
    router.patch(`${route}/:id`,
        async (req, res) => {
            if (! looksLikeRID(req.params.id, false)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: `ID does not look like a valid record ID: ${req.params.id}`}));
                return;
            }
            req.params.id = `#${req.params.id.replace(/^#/, '')}`;
            if (! _.isEmpty(req.query)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: 'No query parameters are allowed for this query type', params: req.query}));
                return;
            }
            try {
                const result = await update(db, {
                    model: model,
                    content: req.body,
                    where: {'@rid': req.params.id, deletedAt: null},
                    user: req.user
                });
                if (cacheUpdate) {
                    await cacheUpdate(db);
                }
                res.json(jc.decycle(result));
            } catch (err) {
                if (err instanceof AttributeError) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json(err);
                } else if (err instanceof NoRecordFoundError) {
                    res.status(HTTP_STATUS.NOT_FOUND).json(err);
                } else if (err instanceof RecordExistsError) {
                    res.status(HTTP_STATUS.CONFLICT).json(err);
                } else {
                    if (verbose) {
                        console.error(err);
                    }
                    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
                }
            }
        }
    );
    router.delete(`${route}/:id`,
        async (req, res) => {
            if (! looksLikeRID(req.params.id, false)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: `ID does not look like a valid record ID: ${req.params.id}`}));
                return;
            }
            req.params.id = `#${req.params.id.replace(/^#/, '')}`;
            if (! _.isEmpty(req.query)) {
                res.status(HTTP_STATUS.BAD_REQUEST).json(new AttributeError({message: 'No query parameters are allowed for this query type'}));
                return;
            }
            try {
                const result = await remove(db, {model: model, where: {'@rid': req.params.id, deletedAt: null}, user: req.user});
                if (cacheUpdate) {
                    await cacheUpdate(db);
                }
                res.json(jc.decycle(result));
            } catch (err) {
                if (err instanceof AttributeError) {
                    res.status(HTTP_STATUS.BAD_REQUEST).json(err);
                } else if (err instanceof NoRecordFoundError) {
                    res.status(HTTP_STATUS.NOT_FOUND).json(err);
                } else {
                    if (verbose) {
                        console.error(err);
                    }
                    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
                }
            }
        }
    );
};


module.exports = {validateParams, addResourceRoutes, InputValidationError};
