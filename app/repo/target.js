const {Base, KBVertex, KBEdge, Record, KBUser} = require('./base');
const {AttributeError, NoResultFoundError, ControlledVocabularyError} = require('./error');
const {Context} = require('./context');
const Promise = require('bluebird');

class Target extends KBVertex {
    
    static createClass(db) {
        const props = [
            {name: 'name', type: 'string', mandatory: true, notNull: true},
            {name: 'type', type: 'string', mandatory: false},
        ];

        const idxs = [{
                name: this.clsname + '.index_name',
                type: 'unique',
                metadata: {ignoreNullValues: false},
                properties: ['name' ,'deleted_at'],
                'class':  this.clsname
            }];
        
        return new Promise((resolve, reject) => {
            Base.createClass({db, clsname: this.clsname, superClasses: Context.clsname, properties: props})
                .then(() => {
                    return this.loadClass(db);
                }).then((cls) => {
                    resolve(cls);
                }).catch((error) => {
                    reject(error);
                });
        });
    }
}