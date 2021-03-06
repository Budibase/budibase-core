import {
  join, pull,
  map, flatten, orderBy,
  filter, find,
} from 'lodash/fp';
import {
  getParentKey,
  getFlattenedHierarchy,
  getCollectionNodeByKeyOrNodeKey, getNodeForCollectionPath,
  isCollectionRecord, isAncestor,
} from '../templateApi/hierarchy';
import { joinKey, safeKey, $ } from '../common';

const allIdChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-';

const allIdsStringsForFactor = (collectionNode) => {
  const factor = collectionNode.allidsShardFactor;
  const charRangePerShard = 64 / factor;
  const allIdStrings = [];
  let index = 0;
  let currentIdsShard = '';
  while (index < 64) {
    currentIdsShard += allIdChars[index];
    if ((index + 1) % charRangePerShard === 0) {
      allIdStrings.push(currentIdsShard);
      currentIdsShard = '';
    }
    index++;
  }

  return allIdStrings;
};

export const getAllIdsShardNames = (appHierarchy, collectionKey) => {
  const collectionRecordNode = getNodeForCollectionPath(appHierarchy)(collectionKey);
  return $(collectionRecordNode, [
    c => [c.nodeId],
    map(i => map(c => _allIdsShardKey(collectionKey, i, c))(allIdsStringsForFactor(collectionRecordNode))),
    flatten,
  ]);
};

const _allIdsShardKey = (collectionKey, childNo, shardKey) => joinKey(
  collectionKey,
  'allids',
  childNo,
  shardKey,
);

export const getAllIdsShardKey = (appHierarchy, collectionKey, recordId) => {
  const indexOfFirstDash = recordId.indexOf('-');

  const collectionNode = getNodeForCollectionPath(appHierarchy)(collectionKey);

  const idFirstChar = recordId[indexOfFirstDash + 1];
  const allIdsShardId = $(collectionNode, [
    allIdsStringsForFactor,
    find(i => i.includes(idFirstChar)),
  ]);

  return _allIdsShardKey(
    collectionKey,
    recordId.slice(0, indexOfFirstDash),
    allIdsShardId,
  );
};

const getOrCreateShardFile = async (datastore, allIdsKey) => {
  try {
    return await datastore.loadFile(allIdsKey);
  } catch (eLoad) {
    try {
      await datastore.createFile(allIdsKey, '');
      return '';
    } catch (eCreate) {
      throw new Error(
        `Error loading, then creating allIds ${allIdsKey
        } : LOAD : ${eLoad.message
        } : CREATE : ${eCreate}`,
      );
    }
  }
};

const getShardFile = async (datastore, allIdsKey) => {
  try {
    return await datastore.loadFile(allIdsKey);
  } catch (eLoad) {
    return '';
  }
};

export const addToAllIds = (appHierarchy, datastore) => async (record) => {
  const allIdsKey = getAllIdsShardKey(
    appHierarchy,
    getParentKey(record.key),
    record.id,
  );

  let allIds = await getOrCreateShardFile(datastore, allIdsKey);

  allIds += `${allIds.length > 0 ? ',' : ''}${record.id}`;

  await datastore.updateFile(allIdsKey, allIds);
};

export const getAllIdsIterator = app => async (collection_Key_or_NodeKey) => {
  collection_Key_or_NodeKey = safeKey(collection_Key_or_NodeKey);
  const targetNode = getCollectionNodeByKeyOrNodeKey(
    app.hierarchy,
    collection_Key_or_NodeKey,
  );

  const getAllIdsIteratorForCollectionKey = async (collectionKey) => {
    const all_allIdsKeys = getAllIdsShardNames(app.hierarchy, collectionKey);
    let shardIndex = 0;

    const allIdsFromShardIterator = async () => {
      if (shardIndex === all_allIdsKeys.length) { return ({ done: true, result: { ids: [], collectionKey } }); }

      const shardKey = all_allIdsKeys[shardIndex];

      const allIds = await getAllIdsFromShard(app.datastore, shardKey);

      shardIndex++;

      return ({
        result: {
          ids: allIds,
          collectionKey,
        },
        done: false,
      });
    };

    return allIdsFromShardIterator;
  };

  const ancestors = $(getFlattenedHierarchy(app.hierarchy), [
    filter(isCollectionRecord),
    filter(n => isAncestor(targetNode)(n)
                    || n.nodeKey() === targetNode.nodeKey()),
    orderBy([n => n.nodeKey().length], ['asc']),
  ]); // parents first

  const traverseForIteraterators = async (parentRecordKey = '', currentNodeIndex = 0) => {
    const currentNode = ancestors[currentNodeIndex];
    const currentCollectionKey = joinKey(
      parentRecordKey,
      currentNode.collectionName,
    );
    if (currentNode.nodeKey() === targetNode.nodeKey()) {
      return [
        await getAllIdsIteratorForCollectionKey(
          currentCollectionKey,
        )];
    }
    const allIterators = [];
    const currentIterator = await getAllIdsIteratorForCollectionKey(
      currentCollectionKey,
    );

    let ids = await currentIterator();
    while (ids.done === false) {
      for (const id of ids.result.ids) {
        allIterators.push(
          await traverseForIteraterators(
            joinKey(currentCollectionKey, id),
            currentNodeIndex + 1,
          ),
        );
      }

      ids = await currentIterator();
    }

    return flatten(allIterators);
  };

  const iteratorsArray = await traverseForIteraterators();
  let currentIteratorIndex = 0;
  return async () => {
    if (iteratorsArray.length === 0) { return { done: true, result: [] }; }
    const innerResult = await iteratorsArray[currentIteratorIndex]();
    if (!innerResult.done) { return innerResult; }
    if (currentIteratorIndex == iteratorsArray.length - 1) {
      return { done: true, result: innerResult.result };
    }
    currentIteratorIndex++;
    return { done: false, result: innerResult.result };
  };
};

const getAllIdsFromShard = async (datastore, shardKey) => {
  const allIdsStr = await getShardFile(datastore, shardKey);

  const allIds = [];
  let currentId = '';
  for (let i = 0; i < allIdsStr.length; i++) {
    const currentChar = allIdsStr.charAt(i);
    const isLast = (i === allIdsStr.length - 1);
    if (currentChar === ',' || isLast) {
      if (isLast) currentId += currentChar;
      allIds.push(currentId);
      currentId = '';
    } else {
      currentId += currentChar;
    }
  }
  return allIds;
};

export const removeFromAllIds = (appHierarchy, datastore) => async (record) => {
  const shardKey = getAllIdsShardKey(
    appHierarchy,
    getParentKey(record.key),
    record.id,
  );
  const allIds = await getAllIdsFromShard(datastore, shardKey);

  const newIds = $(allIds, [
    pull(record.id),
    join(','),
  ]);

  await datastore.updateFile(shardKey, newIds);
};

export default getAllIdsIterator;
