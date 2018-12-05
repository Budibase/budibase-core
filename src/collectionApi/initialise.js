import {getFlattenedHierarchy, hasNoMatchingAncestors, 
    isRecord, isCollection, isShardedIndex, 
    getExactNodeForPath, isGlobalIndex} from "../templateApi/heirarchy";
import {$, allTrue, joinKey} from "../common";
import {filter} from "lodash/fp";
import {getIndexedDataKey} from "../indexing/read";
import getIndexing from "../indexing";
import {getShardMapKey, getUnshardedIndexDataKey} from "../indexing/sharding";

export const initialiseIndex = async (app, parentKey, index) => {
    const indexKey = joinKey(parentKey, index.name);
    await app.datastore.createFolder(indexKey);

    if(isShardedIndex(index)) {
        await app.datastore.createFile(
            getShardMapKey(indexKey),
            ""
        );
    } else {
        const indexing = getIndexing(app);
        await indexing.createIndexFile(
            getUnshardedIndexDataKey(indexKey), 
            index
        );
    }
};

const ensureCollectionIsInitialised = async (app, node, parentKey) => {

    if(!await app.datastore.exists(parentKey)) {
        await app.datastore.createFolder(parentKey);
        await app.datastore.createFolder(
            joinKey(parentKey,"allids")
        );
        for(let childRecord of node.children) {
            await app.datastore.createFolder(
                joinKey(
                    parentKey,
                    "allids",
                    childRecord.collectionChildId.toString())
            );
        }
    }
    

    for(let index of node.indexes) {
        await initialiseIndex(app, parentKey, index);
    }    
}

export const initialiseAll = app => async () => {

    const collectionThatIsNotAnAncestorOfARecord = 
        allTrue(
            hasNoMatchingAncestors(isRecord), 
            isCollection
        );

    const flatheirarchy = getFlattenedHierarchy(app.heirarchy);

    const collections = $(flatheirarchy, [
        filter(collectionThatIsNotAnAncestorOfARecord)
    ]);

    const globalIndexes = $(flatheirarchy, [
        filter(isGlobalIndex)
    ]);
    
    for(let col of collections) {
        await ensureCollectionIsInitialised(
                app, 
                col, 
                col.pathRegx());
    }

    for(let index of globalIndexes) {
        await initialiseIndex(app, "", index);
    }
};

export const initialiseChildCollections = async (app, recordKey) => {
    const childCollections = $(recordKey, [
        getExactNodeForPath(app.heirarchy),
        n => n.children,
        filter(isCollection)
    ]);

    for(let child of childCollections) {
        await ensureCollectionIsInitialised(
            app,
            child,
            joinKey(recordKey, child.name)
        );
    }
};