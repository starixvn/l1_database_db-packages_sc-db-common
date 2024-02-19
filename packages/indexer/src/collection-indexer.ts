import { CollationOptions, Collection, Document, IndexDescription, IndexDirection, MongoServerError } from "mongodb";

export async function deployIndex<T extends Document>(collection: Collection<T>, index: IndexDescription) {
    try {
        return await createIndex(collection, index);
    } catch (error) {
        if (error instanceof MongoServerError && error.codeName !== "IndexOptionsConflict") {
            await dropIndex(collection, index);
            return await createIndex(collection, index);
        }
        console.log(new Date().toISOString(), "E", error);
    }
    return "";
}

export async function createIndex<T extends Document>(collection: Collection<T>, index: IndexDescription) {
    const { key, ...options } = index;
    options.name = generateIndexName(collection.collectionName, index);
    return await collection.createIndex(key, options);
}

function generateIndexName(collectionName: string, indexDescription: IndexDescription): string {
    const { key, unique, sparse, partialFilterExpression, expireAfterSeconds, collation } = indexDescription;

    /** Default _id index name */
    if (JSON.stringify(key) === JSON.stringify({ _id: 1 })) {
        return "_id_";
    }

    /** Build index name */
    let name = "IX";

    /** Unique index prefix */
    name = unique ? `U${name}` : name;

    /** Sparse index prefix */
    name = sparse ? `S${name}` : name;

    /** Filter index prefix */
    name = partialFilterExpression ? `F${name}` : name;

    /** TTL index prefix */
    name = typeof expireAfterSeconds === "number" ? `TTL_${name}` : name;

    /** Index name:
     *    [TTL]_[F][S][U]IX_[CollectionName]_[Keys]_[Collation]
     */
    name = [name, collectionName, generateKeysName(key), generateCollationName(collation)].filter(Boolean).join("_");

    return name;
}

function generateKeysName(key: IndexDescription["key"]): string {
    return Object.entries(key).map(mapKeyEntries).join("_");
}

function mapKeyEntries([key, value]: [string, IndexDirection]): string {
    /** - Omit value when is default IndexDirection = 1
     *  - Key entry will be mapped to "key$value" string
     */
    return [key, value === 1 ? null : value].filter(Boolean).join("$");
}

function generateCollationName(collation?: CollationOptions): string {
    /** Return empty string of no collation provided */
    if (!collation) {
        return "";
    }

    /** Collation name is a "locale_strength" string */
    return [collation.locale, collation.strength].filter(Boolean).join("_");
}

export async function dropIndex<T extends Document>(collection: Collection<T>, index: IndexDescription): Promise<{ ok: number }> {
    const { key } = index;
    const indexName = await getIndexName(collection, key);

    if (!indexName) {
        return { ok: 0 };
    }

    /** Drop index by name */
    try {
        const { ok } = await collection.dropIndex(indexName);
        return { ok };
    } catch (error) {
        console.log(new Date().toISOString(), "E", error);
    }

    return { ok: 0 };
}

async function getIndexName<T extends Document>(collection: Collection<T>, filterKey: IndexDescription["key"]): Promise<string> {
    const indexes = collection.listIndexes();
    const filterString = JSON.stringify(filterKey);

    for await (const index of indexes) {
        const { key, name } = index;
        if (JSON.stringify(key) === filterString) {
            return name;
        }
    }

    return "";
}
